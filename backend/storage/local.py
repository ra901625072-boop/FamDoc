import os
from storage.base import StorageProvider

class LocalStorageProvider(StorageProvider):
    def health_check(self, config: dict) -> bool:
        """Local disk is always available."""
        return True

    def verify_credentials(self, config: dict) -> bool:
        return True

    def ensure_vault_folder(self, family_id: str, config: dict, db = None) -> str:
        # Create a directory inside the backend folder named 'local_vault'
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "local_vault"))
        vault_dir = os.path.join(base_dir, family_id)
        os.makedirs(vault_dir, exist_ok=True)
        return vault_dir

    def create_folder(self, config: dict, parent_folder_id: str, folder_name: str, db = None) -> str:
        # Local storage is flat; DB controls the virtual hierarchy.
        # We return a unique string to act as the virtual cloud_folder_id.
        import uuid
        return f"local_folder_{uuid.uuid4()}"

    def move_file(self, config: dict, cloud_file_id: str, new_parent_id: str, db = None) -> bool:
        # Local storage is flat; DB tracks virtual hierarchy, so disk operations are not needed.
        return True

    def upload_file(self, config: dict, vault_folder_id: str, filename: str, file_content: bytes, mimetype: str, username: str = None, db = None) -> dict:
        import uuid
        os.makedirs(vault_folder_id, exist_ok=True)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(vault_folder_id, unique_filename)
        with open(file_path, "wb") as f:
            f.write(file_content)
        return {
            "cloud_file_id": unique_filename,
            "cloud_link": None
        }

    def download_file(self, config: dict, cloud_file_id: str, db = None) -> bytes:
        vault_dir = config.get("vault_folder_id")
        if not vault_dir:
            raise Exception("Local vault directory is not configured")
        file_path = os.path.join(vault_dir, cloud_file_id)
        if not os.path.exists(file_path):
            raise Exception(f"Local file not found: {cloud_file_id}")
        with open(file_path, "rb") as f:
            return f.read()

    def stream_file(self, config: dict, cloud_file_id: str, db = None, range_header: str = None):
        vault_dir = config.get("vault_folder_id")
        if not vault_dir:
            raise Exception("Local vault directory is not configured")
        file_path = os.path.join(vault_dir, cloud_file_id)
        if not os.path.exists(file_path):
            raise Exception(f"Local file not found: {cloud_file_id}")
        
        file_size = os.path.getsize(file_path)
        start = 0
        end = file_size - 1 if file_size > 0 else 0
        is_range = False

        if range_header and range_header.startswith("bytes="):
            try:
                range_val = range_header.replace("bytes=", "").strip()
                parts = range_val.split("-")
                if parts[0]:
                    start = int(parts[0])
                if len(parts) > 1 and parts[1]:
                    end = int(parts[1])
                if end >= file_size:
                    end = file_size - 1
                if start <= end and start < file_size:
                    is_range = True
            except Exception:
                is_range = False

        def chunk_generator():
            with open(file_path, "rb") as f:
                if is_range:
                    f.seek(start)
                    remaining = end - start + 1
                    while remaining > 0:
                        chunk_to_read = min(128 * 1024, remaining)
                        chunk = f.read(chunk_to_read)
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
                else:
                    while True:
                        chunk = f.read(128 * 1024)
                        if not chunk:
                            break
                        yield chunk

        if is_range:
            return chunk_generator(), start, end, file_size
        return chunk_generator(), None, None, file_size

    def delete_file(self, config: dict, cloud_file_id: str, db = None) -> bool:
        vault_dir = config.get("vault_folder_id")
        if vault_dir:
            file_path = os.path.join(vault_dir, cloud_file_id)
            if os.path.exists(file_path):
                os.remove(file_path)
        return True

    def rename_file(self, config: dict, cloud_file_id: str, new_name: str, db = None) -> bool:
        # Local files are identified on disk using their unique cloud_file_id (which contains a UUID prefix).
        # We keep the physical file name unchanged on rename to avoid collisions and preserve uniqueness.
        # The database record tracks the user-facing name in file.filename.
        return True

