from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth
from storage.storage_manager import StorageManager
from utils.audit import log_action

router = APIRouter(prefix="/api/recycle-bin", tags=["Recycle Bin"])

@router.get("")
def get_recycle_bin(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not joined a family yet."
        )

    # Get all soft-deleted files and folders belonging to the current user's family
    files = db.query(models.File).filter(
        models.File.family_id == current_user.family_id,
        models.File.deleted_at != None
    ).all()

    folders = db.query(models.Folder).filter(
        models.Folder.family_id == current_user.family_id,
        models.Folder.deleted_at != None
    ).all()

    return {
        "files": [
            {
                "id": f.id,
                "filename": f.filename,
                "file_type": f.file_type,
                "size_bytes": f.size_bytes,
                "uploader_id": f.uploader_id,
                "folder_id": f.folder_id,
                "upload_date": f.upload_date,
                "deleted_at": f.deleted_at
            }
            for f in files
        ],
        "folders": [
            {
                "id": f.id,
                "name": f.name,
                "parent_id": f.parent_id,
                "created_at": f.created_at,
                "deleted_at": f.deleted_at
            }
            for f in folders
        ]
    }

def restore_folder_recursive(folder_id: int, batch_id: str, db: Session):
    # 1. Restore folder itself
    db.query(models.Folder).filter(models.Folder.id == folder_id).update({"deleted_at": None, "deletion_batch_id": None}, synchronize_session=False)
    
    # 2. Restore files in this folder matching the batch_id
    if batch_id:
        db.query(models.File).filter(
            models.File.folder_id == folder_id,
            models.File.deletion_batch_id == batch_id
        ).update({"deleted_at": None, "deletion_batch_id": None}, synchronize_session=False)
        
        # 3. Recurse into subfolders matching the batch_id
        subfolders = db.query(models.Folder).filter(
            models.Folder.parent_id == folder_id,
            models.Folder.deletion_batch_id == batch_id
        ).all()
    else:
        # Fallback for legacy deleted folders: restore all deleted files/subfolders
        db.query(models.File).filter(
            models.File.folder_id == folder_id
        ).update({"deleted_at": None, "deletion_batch_id": None}, synchronize_session=False)
        
        subfolders = db.query(models.Folder).filter(
            models.Folder.parent_id == folder_id
        ).all()
        
    for sub in subfolders:
        restore_folder_recursive(sub.id, batch_id, db)

@router.post("/{item_type}/{item_id}/restore")
def restore_item(
    item_type: str,
    item_id: int,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if item_type == "file":
        file = auth.verify_resource_access(
            models.File,
            item_id,
            current_user.family_id,
            db,
            include_deleted=True
        )
        
        if file.deleted_at is not None:
            file.deleted_at = None
            file.deletion_batch_id = None
            db.commit()
            
            ip = request.client.host if request.client else "127.0.0.1"
            log_action(db, "RESTORE_FILE", current_user.id, current_user.family_id, ip, f"Restored file: {file.filename}")
        
        return {"message": f"Successfully restored file: {file.filename}"}

    elif item_type == "folder":
        folder = auth.verify_resource_access(
            models.Folder,
            item_id,
            current_user.family_id,
            db,
            include_deleted=True
        )
        
        if folder.deleted_at is not None:
            restore_folder_recursive(item_id, folder.deletion_batch_id, db)
            db.commit()
            
            ip = request.client.host if request.client else "127.0.0.1"
            log_action(db, "RESTORE_FOLDER", current_user.id, current_user.family_id, ip, f"Restored folder: {folder.name}")
        
        return {"message": f"Successfully restored folder: {folder.name}"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid item type (must be 'file' or 'folder')")

def purge_folder_recursive(folder_id: int, family: models.Family, db: Session):
    # 1. Recurse into subfolders
    subfolders = db.query(models.Folder).filter(models.Folder.parent_id == folder_id).all()
    for sub in subfolders:
        purge_folder_recursive(sub.id, family, db)
        
    # 2. Delete files in this folder physically from cloud and DB
    files = db.query(models.File).filter(models.File.folder_id == folder_id).all()
    manager = StorageManager()
    family_config = manager.get_family_config(family, db)
    for file in files:
        try:
            provider = file.storage_provider or "local"
            config = family_config.get(provider, {})
            manager.providers[provider].delete_file(config, file.file_id, db=db)
        except Exception as e:
            print(f"Warning: Failed to delete cloud file {file.file_id} on {file.storage_provider} during purge: {e}")
        db.delete(file)
            
    # 3. Delete folder record and cloud folder node
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if folder:
        if folder.cloud_folder_id and family.storage_provider != "local":
            try:
                from storage import get_storage_provider
                provider_name = family.storage_provider
                provider = get_storage_provider(provider_name)
                config = family_config.get(provider_name, {})
                provider.delete_file(config, folder.cloud_folder_id, db=db)
            except Exception as e:
                print(f"Warning: Failed to delete cloud folder {folder.cloud_folder_id} on {family.storage_provider} during purge: {e}")
        db.delete(folder)

@router.delete("/{item_type}/{item_id}/purge", status_code=status.HTTP_204_NO_CONTENT)
def purge_item(
    item_type: str,
    item_id: int,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Enforce role logic: only admins can permanently purge items from recycle bin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only family administrators can permanently delete items from the recycle bin."
        )

    family = current_user.family
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    if item_type == "file":
        file = auth.verify_resource_access(
            models.File,
            item_id,
            current_user.family_id,
            db,
            include_deleted=True
        )
        
        if file.deleted_at is not None:
            # Delete from cloud
            try:
                manager = StorageManager()
                family_config = manager.get_family_config(family, db)
                provider = file.storage_provider or "local"
                config = family_config.get(provider, {})
                manager.providers[provider].delete_file(config, file.file_id, db=db)
            except Exception as e:
                print(f"Warning: Failed to delete cloud file {file.file_id} during purge: {e}")
            
            db.delete(file)
            db.commit()
            
            ip = request.client.host if request.client else "127.0.0.1"
            log_action(db, "PURGE_FILE", current_user.id, current_user.family_id, ip, f"Permanently deleted file: {file.filename}")
        
        return None

    elif item_type == "folder":
        folder = auth.verify_resource_access(
            models.Folder,
            item_id,
            current_user.family_id,
            db,
            include_deleted=True
        )
        
        if folder.deleted_at is not None:
            purge_folder_recursive(item_id, family, db)
            db.commit()
            
            ip = request.client.host if request.client else "127.0.0.1"
            log_action(db, "PURGE_FOLDER", current_user.id, current_user.family_id, ip, f"Permanently deleted folder: {folder.name}")
        
        return None
    
    else:
        raise HTTPException(status_code=400, detail="Invalid item type (must be 'file' or 'folder')")
