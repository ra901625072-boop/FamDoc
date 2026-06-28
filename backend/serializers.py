import models
from datetime import datetime

def serialize_file(file: models.File, is_shared: bool = False) -> dict:
    uploader_email = None
    if file.uploader:
        uploader_email = file.uploader.email
        
    return {
        "id": file.id,
        "filename": file.filename,
        "file_type": file.file_type,
        "size_bytes": file.size_bytes,
        "uploader_id": file.uploader_id,
        "uploader_email": uploader_email,
        "folder_id": file.folder_id,
        "family_id": file.family_id,
        "upload_date": file.upload_date,
        "storage_provider": file.storage_provider,
        "cloud_file_id": file.file_id,
        "cloud_link": file.cloud_link,
        "is_shared": is_shared
    }

def serialize_folder(folder: models.Folder, file_count: int = 0, total_size: int = 0, last_modified: datetime = None) -> dict:
    if last_modified is None:
        last_modified = folder.created_at
        
    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id,
        "family_id": folder.family_id,
        "created_at": folder.created_at,
        "file_count": file_count,
        "total_size_bytes": total_size,
        "last_modified": last_modified
    }
