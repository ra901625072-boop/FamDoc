from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth
from sqlalchemy import func
from utils.audit import log_action
import re
from serializers import serialize_folder

SAFE_FILENAME_PATTERN = re.compile(r'^[\w\-. ()\[\]]+$', re.UNICODE)

def ensure_folder_cloud_id(folder_id: int, family: models.Family, db: Session) -> str:
    """
    Ensures that a database folder has a corresponding cloud folder ID.
    If not, creates it in the cloud storage (resolving parent folders recursively if needed).
    Returns the cloud folder ID.
    """
    if folder_id is None:
        return family.vault_folder_id

    folder = db.query(models.Folder).filter(
        models.Folder.id == folder_id,
        models.Folder.family_id == family.id
    ).first()
    if not folder:
        raise Exception("Folder not found")

    if folder.cloud_folder_id:
        return folder.cloud_folder_id

    # Recursively ensure parent has a cloud folder ID
    parent_cloud_id = ensure_folder_cloud_id(folder.parent_id, family, db)

    # Create folder in the cloud storage
    from storage import get_storage_provider
    from storage.storage_manager import StorageManager
    manager = StorageManager()
    provider = get_storage_provider(family.storage_provider or "local")
    family_config = manager.get_family_config(family, db)
    provider_config = family_config.get(family.storage_provider or "local", {})

    cloud_folder_id = provider.create_folder(
        config=provider_config,
        parent_folder_id=parent_cloud_id,
        folder_name=folder.name,
        db=db
    )
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
    
    result = [serialize_folder(folder, file_count, total_size, last_modified_file) for folder, file_count, total_size, last_modified_file in query_results]
        
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
        parent = auth.verify_resource_access(
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

    # Get parent cloud folder ID (recursive lazy init if parent cloud ID is missing)
    try:
        parent_cloud_id = ensure_folder_cloud_id(folder_in.parent_id, family, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve parent cloud directory: {str(e)}"
        )

    # Create folder on the storage provider
    provider_name = family.storage_provider or "local"
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create directory in cloud storage: {str(e)}"
        )

    new_folder = models.Folder(
        name=folder_name,
        parent_id=folder_in.parent_id,
        family_id=current_user.family_id,
        cloud_folder_id=cloud_folder_id
    )
    
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "CREATE_FOLDER", current_user.id, current_user.family_id, ip, f"Created folder: {new_folder.name}")
    
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
    
    # Sync rename to cloud storage provider
    if folder.cloud_folder_id and family.storage_provider != "local":
        try:
            from storage import get_storage_provider
            from storage.storage_manager import StorageManager
            manager = StorageManager()
            provider = get_storage_provider(family.storage_provider)
            family_config = manager.get_family_config(family, db)
            provider_config = family_config.get(family.storage_provider, {})
            provider.rename_file(provider_config, folder.cloud_folder_id, new_name, db=db)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to rename folder in cloud storage: {str(e)}"
            )
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "RENAME_FOLDER", current_user.id, current_user.family_id, ip, f"Renamed folder '{old_name}' to '{folder.name}'")
    
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
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "DELETE_FOLDER", current_user.id, current_user.family_id, ip, f"Soft-deleted folder: {folder.name}")
    
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
    if family.storage_provider != "local":
        try:
            from storage import get_storage_provider
            from storage.storage_manager import StorageManager
            manager = StorageManager()
            provider = get_storage_provider(family.storage_provider)
            family_config = manager.get_family_config(family, db)
            provider_config = family_config.get(family.storage_provider, {})

            # Ensure both the current folder and the destination parent have cloud IDs
            folder_cloud_id = ensure_folder_cloud_id(folder.id, family, db)
            dest_cloud_id = ensure_folder_cloud_id(folder_in.parent_id, family, db)

            provider.move_file(provider_config, folder_cloud_id, dest_cloud_id, db=db)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to move folder in cloud storage: {str(e)}"
            )

    folder.parent_id = folder_in.parent_id
    db.commit()
    db.refresh(folder)
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    dest_name = "Root" if folder.parent_id is None else f"Folder ID {folder.parent_id}"
    log_action(db, "MOVE_FOLDER", current_user.id, current_user.family_id, ip, f"Moved folder '{folder.name}' to '{dest_name}'")
    
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
