from abc import ABC, abstractmethod

class StorageProvider(ABC):
    @abstractmethod
    def health_check(self, config: dict) -> bool:
        """
        Perform a lightweight availability check for this storage provider.
        Must complete within 3 seconds. Returns True if reachable, False otherwise.
        Should NOT raise exceptions — always returns a boolean.
        """
        pass

    @abstractmethod
    def verify_credentials(self, config: dict) -> bool:
        """
        Verify if the given storage configuration is valid and can authenticate.
        Returns True if successful, raises exception or returns False otherwise.
        """
        pass

    @abstractmethod
    def ensure_vault_folder(self, family_id: str, config: dict, db = None) -> str:
        """
        Ensures that a root family vault folder exists in the storage provider.
        Returns the unique ID of the vault folder.
        """
        pass

    @abstractmethod
    def create_folder(self, config: dict, parent_folder_id: str, folder_name: str, db = None) -> str:
        """
        Creates a folder in the cloud storage under the specified parent folder.
        Returns the unique ID of the created folder.
        """
        pass

    @abstractmethod
    def move_file(self, config: dict, cloud_file_id: str, new_parent_id: str, db = None) -> bool:
        """
        Moves a file or folder from one parent folder to another in the cloud storage.
        """
        pass

    @abstractmethod
    def upload_file(self, config: dict, vault_folder_id: str, filename: str, file_content: bytes, mimetype: str, username: str = None, db = None) -> dict:
        """
        Uploads file content to the cloud vault folder.
        Returns a dictionary containing:
        - 'cloud_file_id': the unique file identifier in the cloud
        - 'cloud_link': a URL to view or preview the file in the cloud (optional)
        """
        pass

    @abstractmethod
    def download_file(self, config: dict, cloud_file_id: str, db = None) -> bytes:
        """
        Downloads a file from the cloud by its cloud file ID.
        Returns the raw binary bytes of the file.
        """
        pass

    @abstractmethod
    def delete_file(self, config: dict, cloud_file_id: str, db = None) -> bool:
        """
        Deletes a file from the cloud storage by its cloud file ID.
        Returns True if successful.
        """
        pass

    @abstractmethod
    def rename_file(self, config: dict, cloud_file_id: str, new_name: str, db = None) -> bool:
        """
        Renames a file in the cloud storage.
        Returns True if successful.
        """
        pass

    def get_direct_download_url(self, config: dict, cloud_file_id: str) -> str:
        """
        Optional: Returns a direct URL to download/preview the file directly from cloud.
        Returns None if direct URL is not supported or cannot be generated.
        """
        return None

    def get_thumbnail_url(self, config: dict, cloud_file_id: str, db = None) -> str:
        """
        Optional: Returns a direct URL to fetch a thumbnail of the file.
        Returns None if not supported.
        """
        return None

    def stream_file(self, config: dict, cloud_file_id: str, db = None):
        """
        Optional: Returns a generator that streams the file content in chunks.
        Returns None if not supported.
        """
        return None

    def stream_thumbnail(self, config: dict, cloud_file_id: str, db = None):
        """
        Optional: Returns a generator that streams a pre-rendered thumbnail of the file in chunks.
        Returns None if not supported.
        """
        return None



import time

class SimpleRetry:
    def __init__(self, attempts=3, wait=1):
        self.attempts = attempts
        self.wait = wait

    def __iter__(self):
        class Attempt:
            def __init__(self, parent, attempt_num):
                self.parent = parent
                self.attempt_num = attempt_num
                self.success = True
            def __enter__(self): return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                if exc_type is not None:
                    self.success = False
                    if self.attempt_num >= self.parent.attempts - 1:
                        return False
                    time.sleep(self.parent.wait)
                    return True
                return False
        
        self.current_attempt = None
        for i in range(self.attempts):
            if self.current_attempt and getattr(self.current_attempt, 'success', False):
                break
            self.current_attempt = Attempt(self, i)
            yield self.current_attempt

