from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth
from sqlalchemy import func
from utils.audit import log_action
from utils.ip import get_client_ip
import re
from serializers import serialize_folder
from cache import folder_listing_cache, invalidate_family_caches

SAFE_FILENAME_PATTERN = re.compile(r'^[\w\-. ()\[\]]+$', re.UNICODE)

def ensure_folder_cloud_id(folder_id: int, provider_name: str, family: models.Family, db: Session) -> str:
    """
    Ensures that a database folder has a corresponding cloud folder ID for the specified provider.
    If not, creates it in the cloud storage (resolving parent folders recursively if needed).
    Returns the cloud folder ID.
    """
    if provider_name == "local":
        return None

    from storage.storage_manager import StorageManager
    manager = StorageManager()
    family_config = manager.get_family_config(family, db)

    if folder_id is None:
        return family_config.get(provider_name, {}).get("vault_folder_id") or family.vault_folder_id

    folder = db.query(models.Folder).filter(
        models.Folder.id == folder_id,
        models.Folder.family_id == family.id
    ).first()
    if not folder:
        raise Exception("Folder not found")

    # Check provider-specific folder ID
    if provider_name == "google":
        if folder.google_drive_folder_id:
            return folder.google_drive_folder_id

    # Fallback to legacy cloud_folder_id if it exists and matches current provider
    if folder.cloud_folder_id and family.storage_provider == provider_name:
        if provider_name == "google":
            folder.google_drive_folder_id = folder.cloud_folder_id
        db.commit()
        return folder.cloud_folder_id

    # Recursively ensure parent has a cloud folder ID for this provider
    parent_cloud_id = ensure_folder_cloud_id(folder.parent_id, provider_name, family, db)

    # Create folder in the cloud storage
    from storage import get_storage_provider
    provider = get_storage_provider(provider_name)
    provider_config = family_config.get(provider_name, {})

    cloud_folder_id = provider.create_folder(
        config=provider_config,
        parent_folder_id=parent_cloud_id,
        folder_name=folder.name,
        db=db
    )

    if provider_name == "google":
        folder.google_drive_folder_id = cloud_folder_id

    # Keep legacy column synchronized for backward compatibility if it's the primary provider
    primary = family_config.get("primary_provider", "google")
    if provider_name == primary or family.storage_provider == provider_name:
        folder.cloud_folder_id = cloud_folder_id

    db.commit()
    db.refresh(folder)
    return cloud_folder_id

router = APIRouter(prefix="/api/folders", tags=["Folders"])

@router.get("", response_model=List[schemas.FolderResponse])
def get_folders(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not joined a family yet."
        )

    query_results = db.query(
        models.Folder,
        func.count(models.File.id).label('file_count'),
        func.coalesce(func.sum(models.File.size_bytes), 0).label('total_size'),
        func.max(models.File.upload_date).label('last_modified_file')
    ).outerjoin(
        models.File, (models.File.folder_id == models.Folder.id) & (models.File.deleted_at == None)
    ).filter(
        models.Folder.family_id == current_user.family_id,
        models.Folder.deleted_at == None
    ).group_by(models.Folder.id).all()

    # Check cache first for faster repeated access
    cache_key = f"folders:{current_user.family_id}"
    cached_result = folder_listing_cache.get(cache_key)
    if cached_result is not None:
        return cached_result
    
    result = [serialize_folder(folder, file_count, total_size, last_modified_file) for folder, file_count, total_size, last_modified_file in query_results]
    
    # Cache the result for subsequent requests
    folder_listing_cache.set(cache_key, result)
        
    return result

@router.post("", response_model=schemas.FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    folder_in: schemas.FolderCreate,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch family record
    family = current_user.family
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    # If parent folder is specified, verify it exists, belongs to the family, and is not deleted
    if folder_in.parent_id is not None:
        auth.verify_resource_access(
            models.Folder,
            folder_in.parent_id,
            current_user.family_id,
            db
        )

    folder_name = folder_in.name.strip()
    if not SAFE_FILENAME_PATTERN.match(folder_name) or len(folder_name) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder name contains unsupported characters. Use only letters, numbers, spaces, and ._-()[]."
        )

    # Initialize family storage to ensure family.vault_folder_id is populated
    from storage.storage_manager import StorageManager
    from storage import get_storage_provider
    manager = StorageManager()
    manager.initialize_family_storage(family, db)

    provider_name = family.storage_provider or "local"
    google_drive_folder_id = None
    cloud_folder_id = None

    # Get parent cloud folder ID (recursive lazy init if parent cloud ID is missing)
    try:
        parent_cloud_id = ensure_folder_cloud_id(folder_in.parent_id, provider_name, family, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve parent cloud directory: {str(e)}"
        )

    # Create folder on the storage provider
    provider = get_storage_provider(provider_name)
    family_config = manager.get_family_config(family, db)
    provider_config = family_config.get(provider_name, {})

    try:
        cloud_folder_id = provider.create_folder(
            config=provider_config,
            parent_folder_id=parent_cloud_id,
            folder_name=folder_name,
            db=db
        )
        if provider_name == "google":
            google_drive_folder_id = cloud_folder_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create directory in cloud storage: {str(e)}"
        )

    new_folder = models.Folder(
        name=folder_name,
        parent_id=folder_in.parent_id,
        family_id=current_user.family_id,
        cloud_folder_id=cloud_folder_id,
        google_drive_folder_id=google_drive_folder_id
    )
    
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    
    # Audit log
    ip = get_client_ip(request)
    log_action(db, "CREATE_FOLDER", current_user.id, current_user.family_id, ip, f"Created folder: {new_folder.name}")
    
    invalidate_family_caches(current_user.family_id)
    
    # Return formatted response
    return serialize_folder(new_folder)

@router.put("/{folder_id}", response_model=schemas.FolderResponse)
def rename_folder(
    folder_id: int,
    folder_in: schemas.FolderRename,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    folder = auth.verify_resource_access(
        models.Folder,
        folder_id,
        current_user.family_id,
        db
    )
        
    old_name = folder.name
    new_name = folder_in.name.strip()
    if not SAFE_FILENAME_PATTERN.match(new_name) or len(new_name) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder name contains unsupported characters. Use only letters, numbers, spaces, and ._-()[]."
        )
        
    family = current_user.family
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    folder.name = new_name
    db.commit()
    db.refresh(folder)
    
    # Sync rename to cloud storage provider(s)
    renamed_somewhere = False
    if family.storage_provider != "local":
        from storage import get_storage_provider
        from storage.storage_manager import StorageManager
        manager = StorageManager()
        family_config = manager.get_family_config(family, db)

        if folder.google_drive_folder_id:
            try:
                provider = get_storage_provider("google")
                provider.rename_file(family_config.get("google", {}), folder.google_drive_folder_id, new_name, db=db)
                renamed_somewhere = True
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to rename folder in Google Drive: {e}")

        if not renamed_somewhere and folder.cloud_folder_id:
            try:
                provider = get_storage_provider(family.storage_provider)
                provider.rename_file(family_config.get(family.storage_provider, {}), folder.cloud_folder_id, new_name, db=db)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to rename folder in cloud storage: {str(e)}"
                )
    
    # Audit log
    ip = get_client_ip(request)
    log_action(db, "RENAME_FOLDER", current_user.id, current_user.family_id, ip, f"Renamed folder '{old_name}' to '{folder.name}'")
    
    invalidate_family_caches(current_user.family_id)
    
    # Calculate stats efficiently
    stats = db.query(
        func.count(models.File.id).label('file_count'),
        func.coalesce(func.sum(models.File.size_bytes), 0).label('total_size'),
        func.max(models.File.upload_date).label('last_modified_file')
    ).filter(models.File.folder_id == folder.id, models.File.deleted_at == None).first()
    
    file_count = stats.file_count or 0
    total_size = stats.total_size or 0
    last_modified = folder.created_at
    if stats.last_modified_file and stats.last_modified_file > last_modified:
        last_modified = stats.last_modified_file

    return serialize_folder(folder, file_count, total_size, last_modified)

def soft_delete_folder_recursive(folder_id: int, batch_id: str, db: Session):
    # 1. Recurse into subfolders
    subfolders = db.query(models.Folder).filter(
        models.Folder.parent_id == folder_id,
        models.Folder.deleted_at == None
    ).all()
    for sub in subfolders:
        soft_delete_folder_recursive(sub.id, batch_id, db)
        
    # 2. Soft delete files in this folder
    db.query(models.File).filter(
        models.File.folder_id == folder_id,
        models.File.deleted_at == None
    ).update({"deleted_at": func.now(), "deletion_batch_id": batch_id}, synchronize_session=False)
            
    # 3. Soft delete folder record
    db.query(models.Folder).filter(
        models.Folder.id == folder_id
    ).update({"deleted_at": func.now(), "deletion_batch_id": batch_id}, synchronize_session=False)

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    folder = auth.verify_resource_access(
        models.Folder,
        folder_id,
        current_user.family_id,
        db
    )
        
    # Execute soft delete
    import uuid
    batch_id = str(uuid.uuid4())
    soft_delete_folder_recursive(folder_id, batch_id, db)
    db.commit()
    
    # Audit log
    ip = get_client_ip(request)
    log_action(db, "DELETE_FOLDER", current_user.id, current_user.family_id, ip, f"Soft-deleted folder: {folder.name}")
    
    invalidate_family_caches(current_user.family_id)
    
    return None

@router.patch("/{folder_id}/move", response_model=schemas.FolderResponse)
def move_folder(
    folder_id: int,
    folder_in: schemas.FolderMove,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    folder = auth.verify_resource_access(
        models.Folder,
        folder_id,
        current_user.family_id,
        db
    )
        
    # Validate destination parent_id
    if folder_in.parent_id is not None:
        if folder_in.parent_id == folder_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot move a folder inside itself"
            )
            
        # Verify parent exists
        parent = auth.verify_resource_access(
            models.Folder,
            folder_in.parent_id,
            current_user.family_id,
            db
        )
            
        # Check for circular reference: destination parent must not be a child of this folder
        curr_parent = parent
        while curr_parent is not None:
            if curr_parent.id == folder_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot move a folder inside its own subfolder"
                )
            if curr_parent.parent_id is None:
                break
            curr_parent = db.query(models.Folder).filter(
                models.Folder.id == curr_parent.parent_id,
                models.Folder.deleted_at == None
            ).first()

    family = current_user.family
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    # Move in cloud storage
    moved_somewhere = False
    if family.storage_provider != "local":
        from storage import get_storage_provider
        from storage.storage_manager import StorageManager
        manager = StorageManager()
        family_config = manager.get_family_config(family, db)

        if folder.google_drive_folder_id:
            try:
                dest_google_id = ensure_folder_cloud_id(folder_in.parent_id, "google", family, db)
                provider = get_storage_provider("google")
                provider.move_file(family_config.get("google", {}), folder.google_drive_folder_id, dest_google_id, db=db)
                moved_somewhere = True
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to move folder in Google Drive: {e}")

        if not moved_somewhere and folder.cloud_folder_id:
            try:
                provider = get_storage_provider(family.storage_provider)
                dest_cloud_id = ensure_folder_cloud_id(folder_in.parent_id, family.storage_provider, family, db)
                provider.move_file(family_config.get(family.storage_provider, {}), folder.cloud_folder_id, dest_cloud_id, db=db)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to move folder in cloud storage: {str(e)}"
                )

    folder.parent_id = folder_in.parent_id
    db.commit()
    db.refresh(folder)
    
    # Audit log
    ip = get_client_ip(request)
    dest_name = "Root" if folder.parent_id is None else f"Folder ID {folder.parent_id}"
    log_action(db, "MOVE_FOLDER", current_user.id, current_user.family_id, ip, f"Moved folder '{folder.name}' to '{dest_name}'")
    
    invalidate_family_caches(current_user.family_id)
    
    # Calculate stats efficiently
    stats = db.query(
        func.count(models.File.id).label('file_count'),
        func.coalesce(func.sum(models.File.size_bytes), 0).label('total_size'),
        func.max(models.File.upload_date).label('last_modified_file')
    ).filter(models.File.folder_id == folder.id, models.File.deleted_at == None).first()
    
    file_count = stats.file_count or 0
    total_size = stats.total_size or 0
    last_modified = folder.created_at
    if stats.last_modified_file and stats.last_modified_file > last_modified:
        last_modified = stats.last_modified_file

    return serialize_folder(folder, file_count, total_size, last_modified)
