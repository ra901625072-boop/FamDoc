from storage.base import StorageProvider
from storage.google_drive_provider import GoogleDriveProvider
from storage.local import LocalStorageProvider
from storage.r2_provider import R2StorageProvider

def get_storage_provider(provider_name: str) -> StorageProvider:
    if provider_name == "google":
        return GoogleDriveProvider()
    elif provider_name == "local":
        return LocalStorageProvider()
    elif provider_name == "r2":
        return R2StorageProvider()
    else:
        raise ValueError(f"Unsupported storage provider: {provider_name}")
