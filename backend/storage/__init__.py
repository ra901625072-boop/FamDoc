from storage.base import StorageProvider
from storage.google_drive_provider import GoogleDriveProvider
from storage.local import LocalStorageProvider

def get_storage_provider(provider_name: str) -> StorageProvider:
    if provider_name == "google":
        return GoogleDriveProvider()
    elif provider_name == "local":
        return LocalStorageProvider()
    else:
        raise ValueError(f"Unsupported storage provider: {provider_name}")
