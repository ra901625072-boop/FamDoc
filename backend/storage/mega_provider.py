import os
import tempfile
import shutil
from mega import Mega
from storage.base import StorageProvider

# Monkeypatch Mega.get_files to prevent crash on empty accounts/missing 'f' key
def _patched_get_files(self):
    files = self._api_request({'a': 'f', 'c': 1, 'r': 1})
    files_dict = {}
    if not isinstance(files, dict) or 'f' not in files:
        return files_dict
    shared_keys = {}
    self._init_shared_keys(files, shared_keys)
    for file in files['f']:
        processed_file = self._process_file(file, shared_keys)
        if processed_file['a']:
            files_dict[file['h']] = processed_file
    return files_dict
Mega.get_files = _patched_get_files


# In-memory session cache: (email, password) -> Mega logged-in instance
_mega_sessions = {}

class MegaProvider(StorageProvider):
    def _get_client(self, config: dict):
        email = config.get("email")
        password = config.get("password")
        if not email or not password:
            raise Exception("Email and password are required for Mega configuration")
            
        cache_key = f"{email}:{password}"
        if cache_key in _mega_sessions:
            client = _mega_sessions[cache_key]
            # Verify session is still active
            try:
                client.get_user()
                return client
            except Exception:
                _mega_sessions.pop(cache_key, None)
                
        import json
        import hashlib
        session_file = os.path.join(tempfile.gettempdir(), f"mega_session_{hashlib.md5(email.encode()).hexdigest()}.json")
        if os.path.exists(session_file):
            try:
                with open(session_file, "r") as f:
                    data = json.load(f)
                client = Mega()
                client.sid = data["sid"]
                client.master_key = tuple(data["master_key"])
                client.sequence_num = data["sequence_num"]
                client._trash_folder_node_id = data.get("trash_node")
                
                client.get_user()
                _mega_sessions[cache_key] = client
                return client
            except Exception:
                pass
                
        mega = Mega()
        try:
            client = mega.login(email, password)
        except Exception as e:
            if "EBLOCKED" in str(e):
                raise Exception("Mega account or IP is temporarily blocked (EBLOCKED). Please wait before trying again.") from e
            raise
            
        _mega_sessions[cache_key] = client
        
        try:
            with open(session_file, "w") as f:
                json.dump({
                    "sid": client.sid,
                    "master_key": list(client.master_key),
                    "sequence_num": client.sequence_num,
                    "trash_node": client._trash_folder_node_id
                }, f)
        except Exception:
            pass
            
        return client

    def health_check(self, config: dict) -> bool:
        """Session validation or fresh login attempt with 10s timeout."""
        import concurrent.futures
        def _check():
            client = self._get_client(config)
            client.get_user()
            return True
            
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_check)
                return future.result(timeout=10.0)
        except Exception as e:
            import traceback
            print("Mega health_check exception:")
            traceback.print_exc()
            return False

    def verify_credentials(self, config: dict) -> bool:
        try:
            self._get_client(config)
            return True
        except Exception as e:
            raise Exception(f"Failed to authenticate with Mega: {str(e)}")

    def ensure_vault_folder(self, family_id: str, config: dict) -> str:
        client = self._get_client(config)
        folder_name = f"FamilyVault_{family_id}"
        
        # Get all files and look for the folder
        files = client.get_files()
        for node_id, file_info in files.items():
            # t=1 represents a directory in Mega
            if file_info.get("a", {}).get("n") == folder_name and file_info.get("t") == 1:
                return node_id
                
        # Create folder if it doesn't exist (with retries)
        from storage.base import SimpleRetry
        res = None
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                res = client.create_folder(folder_name)
        node_id = res.get(folder_name)
        
        if not node_id:
            # Retrieve node_id by scanning files again if not directly in dict
            files = client.get_files()
            for nid, file_info in files.items():
                if file_info.get("a", {}).get("n") == folder_name and file_info.get("t") == 1:
                    return nid
            raise Exception("Failed to retrieve created folder ID from Mega")
            
        return node_id

    def upload_file(self, config: dict, vault_folder_id: str, filename: str, file_content: bytes, mimetype: str, username: str = None) -> dict:
        client = self._get_client(config)
        
        # Write content to local temporary file to upload
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, filename)
        
        try:
            with open(temp_file_path, "wb") as f:
                f.write(file_content)
                
            # Perform upload (with retries)
            from storage.base import SimpleRetry
            uploaded_file = None
            for attempt in SimpleRetry(attempts=3, wait=1):
                with attempt:
                    uploaded_file = client.upload(temp_file_path, vault_folder_id)
            
            # Extract cloud file ID
            cloud_file_id = None
            if isinstance(uploaded_file, dict):
                if "f" in uploaded_file and isinstance(uploaded_file["f"], list) and len(uploaded_file["f"]) > 0:
                    cloud_file_id = uploaded_file["f"][0].get("h")
                elif "h" in uploaded_file:
                    cloud_file_id = uploaded_file["h"]
                else:
                    cloud_file_id = uploaded_file.get(filename)
                    
            if not cloud_file_id:
                # Fallback: find it in the folder manually
                files = client.get_files()
                for nid, f_info in files.items():
                    if f_info.get("p") == vault_folder_id and f_info.get("a", {}).get("n") == filename:
                        cloud_file_id = nid
                        break
                        
            if not cloud_file_id:
                raise Exception("Failed to retrieve uploaded file handle from Mega")
                
            # Attempt to generate a public view link
            cloud_link = None
            try:
                files = client.get_files()
                node_obj = files.get(cloud_file_id)
                if node_obj:
                    cloud_link = client.get_link(node_obj)
            except Exception:
                pass
                
            return {
                "cloud_file_id": cloud_file_id,
                "cloud_link": cloud_link
            }
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            shutil.rmtree(temp_dir, ignore_errors=True)

    def download_file(self, config: dict, cloud_file_id: str) -> bytes:
        client = self._get_client(config)
        
        files = client.get_files()
        file_info = files.get(cloud_file_id)
        if not file_info:
            raise Exception("File not found in Mega cloud")
            
        file_obj = (cloud_file_id, file_info)
        temp_dir = tempfile.mkdtemp()
        try:
            from storage.base import SimpleRetry
            try:
                for attempt in SimpleRetry(attempts=3, wait=1):
                    with attempt:
                        client.download(file_obj, temp_dir)
            except PermissionError as e:
                # On Windows, mega.py tries to rename an open temp file causing WinError 32
                if "WinError 32" not in str(e):
                    raise
            except OSError as oe:
                if "WinError 32" not in str(oe):
                    raise
            
            filename = file_info.get("a", {}).get("n")
            downloaded_path = os.path.join(temp_dir, filename)
            
            if not os.path.exists(downloaded_path):
                # Check if download name was slightly altered (e.g. spaces/unicode)
                dir_files = os.listdir(temp_dir)
                if dir_files:
                    downloaded_path = os.path.join(temp_dir, dir_files[0])
                else:
                    raise Exception("File download failed in Mega")
                    
            with open(downloaded_path, "rb") as f:
                file_bytes = f.read()
                
            return file_bytes
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def delete_file(self, config: dict, cloud_file_id: str) -> bool:
        client = self._get_client(config)
        files = client.get_files()
        file_info = files.get(cloud_file_id)
        if not file_info:
            return True # Already deleted
            
        file_obj = (cloud_file_id, file_info)
        from storage.base import SimpleRetry
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                client.destroy(file_obj)
        return True

    def rename_file(self, config: dict, cloud_file_id: str, new_name: str) -> bool:
        client = self._get_client(config)
        files = client.get_files()
        file_info = files.get(cloud_file_id)
        if not file_info:
            raise Exception("File not found in Mega cloud to rename")
            
        file_obj = (cloud_file_id, file_info)
        from storage.base import SimpleRetry
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                client.rename(file_obj, new_name)
        return True

    def get_direct_download_url(self, config: dict, cloud_file_id: str) -> str:
        client = self._get_client(config)
        files = client.get_files()
        file_info = files.get(cloud_file_id)
        if not file_info:
            return None
        file_obj = (cloud_file_id, file_info)
        try:
            return client.get_link(file_obj)
        except Exception:
            return None
