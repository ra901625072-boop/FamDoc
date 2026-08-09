import os
import io
import time
import logging
import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from googleapiclient.errors import HttpError
from storage.base import StorageProvider

logger = logging.getLogger(__name__)

# TCP connection-reset errors that indicate a stale/dead socket
_RETRIABLE_CONNECTION_ERRORS = (
    ConnectionResetError,
    ConnectionAbortedError,
    BrokenPipeError,
    OSError,  # Catches wsarecv errors on Windows
)

class GoogleDriveProvider(StorageProvider):
    def _get_client(self, config: dict, db = None):
        client_id = config.get("client_id")
        client_secret = config.get("client_secret")
        access_token = config.get("access_token")
        refresh_token = config.get("refresh_token")
        expires_at = config.get("expires_at", 0)
        family_id = config.get("family_id")
        
        if not client_id or not client_secret or not refresh_token:
            raise Exception("Google OAuth Client ID, Client Secret, and Refresh Token are required")
            
        current_time = time.time()
        if current_time >= expires_at - 60: # 60 seconds buffer
            try:
                url = "https://oauth2.googleapis.com/token"
                payload = {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token"
                }
                r = requests.post(url, data=payload, timeout=10)
                if r.status_code != 200:
                    raise Exception(f"Failed to refresh Google token: {r.text}")
                res = r.json()
                access_token = res["access_token"]
                expires_in = res["expires_in"]
                expires_at = current_time + expires_in
                
                # Update config dict
                config["access_token"] = access_token
                config["expires_at"] = expires_at
                
                # Update DB if family_id is provided
                if family_id:
                    if db:
                        import models
                        family = db.query(models.Family).filter(models.Family.id == family_id).first()
                        if family:
                            family.storage_config = config
                            db.commit()
                    else:
                        from database import SessionLocal
                        import models
                        db_session = SessionLocal()
                        try:
                            family = db_session.query(models.Family).filter(models.Family.id == family_id).first()
                            if family:
                                family.storage_config = config
                                db_session.commit()
                        finally:
                            db_session.close()
            except Exception as e:
                raise Exception(f"Google Token Refresh Error: {str(e)}")
                
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret
        )
        # cache_discovery=False prevents stale cached discovery docs from causing issues
        service = build('drive', 'v3', credentials=creds, static_discovery=True, cache_discovery=False)
        return service

    def _execute_with_retry(self, request_fn, config, db=None, max_retries=3):
        """
        Execute a Google Drive API call with automatic retry on connection-reset errors.
        On connection reset (wsarecv, BrokenPipe, etc.), rebuilds the service client
        with a fresh TCP connection and retries.
        
        Args:
            request_fn: Callable that takes a service object and returns the API result.
            config: Storage config dict for building the client.
            db: Optional database session.
            max_retries: Maximum number of retry attempts.
        """
        last_error = None
        for attempt in range(max_retries):
            try:
                service = self._get_client(config, db)
                return request_fn(service)
            except _RETRIABLE_CONNECTION_ERRORS as e:
                last_error = e
                err_msg = str(e).lower()
                # Only retry on actual connection reset / broken pipe errors
                if any(keyword in err_msg for keyword in (
                    'wsarecv', 'connection', 'reset', 'broken pipe', 
                    'forcibly closed', 'stream reading', 'eof'
                )):
                    wait_time = (attempt + 1) * 1.5  # 1.5s, 3s, 4.5s
                    logger.warning(
                        f"Google Drive connection reset (attempt {attempt + 1}/{max_retries}): {e}. "
                        f"Rebuilding client and retrying in {wait_time:.1f}s..."
                    )
                    time.sleep(wait_time)
                    continue
                raise  # Re-raise non-connection errors
            except HttpError as e:
                # Retry on 5xx server errors and 429 rate limit
                if e.resp.status in (429, 500, 502, 503):
                    last_error = e
                    wait_time = (attempt + 1) * 2
                    logger.warning(
                        f"Google Drive HTTP {e.resp.status} (attempt {attempt + 1}/{max_retries}). "
                        f"Retrying in {wait_time}s..."
                    )
                    time.sleep(wait_time)
                    continue
                raise
        raise last_error

    def health_check(self, config: dict, db = None) -> bool:
        """Lightweight ping: GET /drive/v3/about with 3s timeout."""
        try:
            # Ensure we have a valid access token (refresh if needed)
            self._get_client(config, db)
            access_token = config.get("access_token")
            if not access_token:
                return False
            r = requests.get(
                "https://www.googleapis.com/drive/v3/about?fields=user",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=3
            )
            return r.status_code == 200
        except Exception:
            return False

    def verify_credentials(self, config: dict, db = None) -> bool:
        try:
            def _verify(service):
                service.files().get(fileId="root", fields="id, name", supportsAllDrives=True).execute()
                return True
            return self._execute_with_retry(_verify, config, db)
        except Exception as e:
            raise Exception(f"OAuth verification failed: {str(e)}")

    def ensure_vault_folder(self, family_id: str, config: dict, db = None) -> str:
        # 1. Fetch family name
        family_name = "Unknown"
        if db:
            import models
            family = db.query(models.Family).filter(models.Family.id == family_id).first()
            if family:
                family_name = family.name
        else:
            from database import SessionLocal
            import models
            db_session = SessionLocal()
            try:
                family = db_session.query(models.Family).filter(models.Family.id == family_id).first()
                if family:
                    family_name = family.name
            finally:
                db_session.close()

        # 2. Find or create the root 'Famdoc' project folder
        project_folder_name = "Famdoc"
        safe_project_folder_name = project_folder_name.replace("'", "\\'")
        project_query = f"mimeType = 'application/vnd.google-apps.folder' and name = '{safe_project_folder_name}' and 'root' in parents and trashed = false"
        
        def _find_project_folder(service):
            return service.files().list(
                q=project_query,
                spaces='drive',
                fields='files(id, name)',
                pageSize=1,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
        
        results = self._execute_with_retry(_find_project_folder, config, db)
                
        project_files = results.get('files', [])
        if project_files:
            project_root_id = project_files[0]['id']
        else:
            file_metadata = {
                'name': project_folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': ['root']
            }
            def _create_project_folder(service):
                return service.files().create(body=file_metadata, fields='id', supportsAllDrives=True).execute()
            new_project_folder = self._execute_with_retry(_create_project_folder, config, db)
            project_root_id = new_project_folder.get('id')

        # 3. Find or create the family-specific subfolder under 'Famdoc'
        if family_name.lower().endswith(" family"):
            family_folder_name = family_name
        else:
            family_folder_name = f"{family_name} Family"
        safe_family_folder_name = family_folder_name.replace("'", "\\'")
        family_query = f"mimeType = 'application/vnd.google-apps.folder' and name = '{safe_family_folder_name}' and '{project_root_id}' in parents and trashed = false"
        
        def _find_family_folder(service):
            return service.files().list(
                q=family_query,
                spaces='drive',
                fields='files(id, name)',
                pageSize=1,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
        
        results = self._execute_with_retry(_find_family_folder, config, db)
                
        family_files = results.get('files', [])
        if family_files:
            return family_files[0]['id']
            
        family_metadata = {
            'name': family_folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [project_root_id]
        }
        
        def _create_family_folder(service):
            return service.files().create(body=family_metadata, fields='id', supportsAllDrives=True).execute()
        new_family_folder = self._execute_with_retry(_create_family_folder, config, db)
                
        return new_family_folder.get('id')

    def create_folder(self, config: dict, parent_folder_id: str, folder_name: str, db = None) -> str:
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_folder_id]
        }
        
        def _create(service):
            return service.files().create(body=file_metadata, fields='id', supportsAllDrives=True).execute()
        
        new_folder = self._execute_with_retry(_create, config, db)
        return new_folder.get('id')

    def move_file(self, config: dict, cloud_file_id: str, new_parent_id: str, db = None) -> bool:
        def _move(service):
            # Retrieve the existing parents to remove
            file_metadata = service.files().get(fileId=cloud_file_id, fields='parents', supportsAllDrives=True).execute()
            previous_parents = ",".join(file_metadata.get('parents', []))
            service.files().update(
                fileId=cloud_file_id,
                addParents=new_parent_id,
                removeParents=previous_parents,
                fields='id, parents',
                supportsAllDrives=True
            ).execute()
            return True
        
        return self._execute_with_retry(_move, config, db)

    def upload_file(self, config: dict, vault_folder_id: str, filename: str, file_content: bytes, mimetype: str, username: str = None, db = None) -> dict:
        target_folder_id = vault_folder_id
        if username:
            # Query for the subfolder with name = username under parent vault_folder_id
            safe_username = username.replace("'", "\\'")
            query = f"mimeType = 'application/vnd.google-apps.folder' and name = '{safe_username}' and '{vault_folder_id}' in parents and trashed = false"
            
            def _find_subfolder(service):
                return service.files().list(
                    q=query,
                    spaces='drive',
                    fields='files(id, name)',
                    pageSize=1,
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
            
            results = self._execute_with_retry(_find_subfolder, config, db)
                    
            subfolders = results.get('files', [])
            if subfolders:
                target_folder_id = subfolders[0]['id']
            else:
                # Create the subfolder under vault_folder_id
                subfolder_metadata = {
                    'name': username,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [vault_folder_id]
                }
                def _create_subfolder(service):
                    return service.files().create(body=subfolder_metadata, fields='id', supportsAllDrives=True).execute()
                new_subfolder = self._execute_with_retry(_create_subfolder, config, db)
                target_folder_id = new_subfolder.get('id')
        
        file_metadata = {
            'name': filename,
            'parents': [target_folder_id]
        }
        
        def _upload(service):
            # Create a fresh MediaIoBaseUpload on each retry attempt
            media = MediaIoBaseUpload(io.BytesIO(file_content), mimetype=mimetype, resumable=True)
            return service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webViewLink',
                supportsAllDrives=True
            ).execute()
        
        uploaded_file = self._execute_with_retry(_upload, config, db)
                
        cloud_file_id = uploaded_file.get('id')
        cloud_link = uploaded_file.get('webViewLink')
        
        return {
            "cloud_file_id": cloud_file_id,
            "cloud_link": cloud_link
        }

    def download_file(self, config: dict, cloud_file_id: str, db = None) -> bytes:
        def _download(service):
            request = service.files().get_media(fileId=cloud_file_id, supportsAllDrives=True)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
            return fh.getvalue()
        
        return self._execute_with_retry(_download, config, db)

    def delete_file(self, config: dict, cloud_file_id: str, db = None) -> bool:
        def _delete(service):
            try:
                service.files().delete(fileId=cloud_file_id, supportsAllDrives=True).execute()
            except Exception as e:
                if "fileNotFound" in str(e) or "404" in str(e):
                    return True
                raise e
            return True
        
        return self._execute_with_retry(_delete, config, db)

    def rename_file(self, config: dict, cloud_file_id: str, new_name: str, db = None) -> bool:
        def _rename(service):
            file_metadata = {'name': new_name}
            service.files().update(
                fileId=cloud_file_id,
                body=file_metadata,
                fields='id',
                supportsAllDrives=True
            ).execute()
            return True
        
        return self._execute_with_retry(_rename, config, db)

    def get_direct_download_url(self, config: dict, cloud_file_id: str, db = None) -> str:
        # Resolve/refresh credentials to ensure access_token is current
        self._get_client(config, db)
        access_token = config.get("access_token")
        if access_token:
            return f"https://www.googleapis.com/drive/v3/files/{cloud_file_id}?alt=media&access_token={access_token}"
        return None
