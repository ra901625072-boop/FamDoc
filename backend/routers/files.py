import io
import re
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db, SessionLocal
import models
import schemas
import auth
from database import get_db, SessionLocal
import models
import schemas
import auth
from sqlalchemy.orm import joinedload
from utils.audit import log_action
import os
from serializers import serialize_file
from datetime import datetime, timezone
from storage.storage_manager import StorageManager

SAFE_FILENAME_PATTERN = re.compile(r'^[\w\-. ()\[\]]+$', re.UNICODE)
def validate_file_content_signature(content: bytes, ext: str) -> bool:
    """
    Validates that the file content's magic bytes match the expected signature for its extension.
    """
    if ext == ".pdf":
        return content.startswith(b"%PDF")
    elif ext in (".jpg", ".jpeg"):
        return content.startswith(b"\xff\xd8\xff")
    elif ext == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    elif ext in (".docx", ".xlsx"):
        # Office XML format (ZIP container)
        return content.startswith(b"PK\x03\x04")
    elif ext in (".doc", ".xls"):
        # Compound File Binary Format (OLE2)
        return content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    elif ext == ".txt":
        # Text files: try to decode as UTF-8 or ASCII
        try:
            content[:4096].decode("utf-8")
            return True
        except UnicodeDecodeError:
            return False
    return True

router = APIRouter(prefix="/api/files", tags=["Files"])

@router.get("", response_model=List[schemas.FileResponse])
def get_files(
    background_tasks: BackgroundTasks,
    folder_id: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not joined a family yet."
        )

    query = db.query(models.File).options(joinedload(models.File.uploader)).filter(
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    )
    
    if folder_id is not None:
        if folder_id == "root" or folder_id == "":
            query = query.filter(models.File.folder_id == None)
        else:
            try:
                fid = int(folder_id)
                auth.verify_resource_access(models.Folder, fid, current_user.family_id, db)
                query = query.filter(models.File.folder_id == fid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid folder_id format")
                
    files = query.all()
    
    shared_file_ids = {sl.file_id for sl in db.query(models.SharedLink.file_id).filter(models.SharedLink.family_id == current_user.family_id).all()}
    
    # Format files responses to include uploader email and preview token
    result = [serialize_file(file, is_shared=(file.id in shared_file_ids), current_user_id=current_user.id) for file in files]
        
    return result

@router.post("/upload", response_model=schemas.FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a file. Always writes to local storage first and responds
    immediately. Cloud promotion happens silently in the background.
    """
    family = current_user.family
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    # Validate parent folder if provided
    if folder_id is not None:
        folder = auth.verify_resource_access(
            models.Folder,
            folder_id,
            current_user.family_id,
            db
        )

    # Check for duplicate filename in the same folder
    existing_file = db.query(models.File).filter(
        models.File.filename == file.filename,
        models.File.folder_id == folder_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    if existing_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A file with this name already exists in this folder."
        )

    # Enforce file type validation
    allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png", ".docx", ".doc", ".xlsx", ".xls", ".txt"}
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Supported formats: PDF, Word, Excel, Images, and TXT."
        )

    if not SAFE_FILENAME_PATTERN.match(file.filename) or len(file.filename) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename contains unsupported characters. Use only letters, numbers, spaces, and ._-()[]."
        )

    content = await file.read()
    file_size = len(content)

    # Enforce file content verification (magic bytes check)
    if not validate_file_content_signature(content, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match the file extension signature."
        )

    # Enforce file size limit (50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum limit of 50MB."
        )

    # Enforce virus scanning check
    from utils.virus_scan import scan_file_for_viruses
    if not await scan_file_for_viruses(content, file.filename, background_tasks):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security error: Upload blocked. The file matches a known malware signature."
        )

    # Enforce family storage quota limit
    from sqlalchemy import func
    used_bytes = db.query(func.sum(models.File.size_bytes)).filter(
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).scalar() or 0

    if used_bytes + file_size > family.storage_quota_bytes:
        quota_mb = family.storage_quota_bytes / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Storage quota exceeded. Your family is allowed up to {quota_mb:.1f} MB of total vault storage."
        )

    manager = StorageManager()
    family_config = manager.get_family_config(family, db)
    provider = family.storage_provider or "local"

    upload_success = False
    cloud_result = None

    if provider == "google":
        try:
            target_config = family_config.get(provider, {})
            manager.initialize_family_storage(family, db)
            
            # Direct cloud upload, skipping local storage
            if folder_id is not None:
                from routers.folders import ensure_folder_cloud_id
                target_vault_id = ensure_folder_cloud_id(folder_id, provider, family, db)
                target_username = None
            else:
                target_vault_id = family.vault_folder_id
                target_username = None

            cloud_result = manager.providers[provider].upload_file(
                config=target_config,
                vault_folder_id=target_vault_id,
                filename=file.filename,
                file_content=content,
                mimetype=file.content_type or "application/octet-stream",
                username=target_username,
                db=db
            )
            upload_success = True
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Direct cloud upload to {provider} failed: {e}. Falling back to local storage and background sync.")
            upload_success = False

    if upload_success and cloud_result:
        db_file = models.File(
            filename         = file.filename,
            file_type        = file.content_type or "application/octet-stream",
            size_bytes       = file_size,
            _file_id         = cloud_result["cloud_file_id"],
            local_file_id    = None,
            cloud_file_id    = cloud_result["cloud_file_id"],
            folder_id        = folder_id,
            family_id        = current_user.family_id,
            uploader_id      = current_user.id,
            storage_provider = provider,
            pending_sync     = False,
            pending_sync_at  = None,
            synced_to        = provider,
            cloud_link       = cloud_result.get("cloud_link"),
            google_drive_file_id = cloud_result["cloud_file_id"],
            primary_storage  = provider,
            backup_status    = "none"
        )
    else:
        local_config = family_config.get("local", {})
        result = manager.write_file(
            content      = content,
            filename     = file.filename,
            mimetype     = file.content_type or "application/octet-stream",
            local_config = local_config,
        )
        
        now = datetime.now(timezone.utc)
        db_file = models.File(
            filename         = file.filename,
            file_type        = file.content_type or "application/octet-stream",
            size_bytes       = file_size,
            _file_id         = result["file_id"],
            local_file_id    = result["file_id"],
            cloud_file_id    = None,
            folder_id        = folder_id,
            family_id        = current_user.family_id,
            uploader_id      = current_user.id,
            storage_provider = "local",
            pending_sync     = (provider != "local"),
            pending_sync_at  = now if (provider != "local") else None,
            synced_to        = None,
            cloud_link       = None,
            primary_storage  = provider,
            backup_status    = "none"
        )

    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "UPLOAD_FILE", current_user.id, current_user.family_id, ip, f"Uploaded file: {db_file.filename} ({db_file.size_bytes} bytes)")

    return serialize_file(db_file, current_user_id=current_user.id)

@router.get("/{file_id}/preview-token")
def get_preview_token(
    file_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    file = auth.verify_resource_access(
        models.File,
        file_id,
        current_user.family_id,
        db
    )
        
    token = auth.create_file_access_token(file.id, current_user.id)
    return {"token": token}

@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user_or_file_preview),
    db: Session = Depends(get_db)
):
    file = auth.verify_resource_access(
        models.File,
        file_id,
        current_user.family_id,
        db
    )
        
    family = current_user.family
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "DOWNLOAD_FILE", current_user.id, current_user.family_id, ip, f"Downloaded file: {file.filename}")
    
    manager = StorageManager()
    family_config = manager.get_family_config(family, db)

    try:
        content = manager.read_file(file, family_config, db=db)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{file.filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/{file_id}/preview")
def preview_file(
    file_id: int,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user_or_file_preview),
    db: Session = Depends(get_db)
):
    file = auth.verify_resource_access(
        models.File,
        file_id,
        current_user.family_id,
        db
    )
        
    family = current_user.family
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "PREVIEW_FILE", current_user.id, current_user.family_id, ip, f"Previewed file: {file.filename}")
    
    manager = StorageManager()
    family_config = manager.get_family_config(family, db)

    try:
        content = manager.read_file(file, family_config, db=db)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return StreamingResponse(
        io.BytesIO(content),
        media_type=file.file_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{file.filename}"'}
    )

@router.put("/{file_id}", response_model=schemas.FileResponse)
def rename_file(
    file_id: int,
    file_in: schemas.FileRename,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    file = auth.verify_resource_access(
        models.File,
        file_id,
        current_user.family_id,
        db
    )
        
    if current_user.role != "admin" and file.uploader_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to rename files uploaded by other family members"
        )
        
    family = current_user.family
    old_name = file.filename
    new_name = file_in.filename.strip()
    
    if not SAFE_FILENAME_PATTERN.match(new_name) or len(new_name) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename contains unsupported characters. Use only letters, numbers, spaces, and ._-()[]."
        )
    
    # Check for duplicate filename in the same folder
    duplicate_file = db.query(models.File).filter(
        models.File.filename == new_name,
        models.File.folder_id == file.folder_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None,
        models.File.id != file.id
    ).first()
    if duplicate_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A file with this name already exists in this folder."
        )
    
    try:
        manager = StorageManager()
        family_config = manager.get_family_config(family, db)
        renamed_somewhere = False
        
        if file.google_drive_file_id:
            try:
                cfg = family_config.get("google", {})
                manager.providers["google"].rename_file(cfg, file.google_drive_file_id, new_name, db=db)
                renamed_somewhere = True
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to rename file in Google Drive: {e}")
                
        if not renamed_somewhere:
            provider_name = file.storage_provider or "local"
            cfg = family_config.get(provider_name, {})
            manager.providers[provider_name].rename_file(cfg, file.file_id, new_name, db=db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rename file in cloud storage: {str(e)}"
        )
        
    file.filename = new_name
    db.commit()
    db.refresh(file)
    
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "RENAME_FILE", current_user.id, current_user.family_id, ip, f"Renamed file '{old_name}' to '{new_name}'")
    
    return serialize_file(file, current_user_id=current_user.id)

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: int,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    file = auth.verify_resource_access(
        models.File,
        file_id,
        current_user.family_id,
        db
    )
        
    if current_user.role != "admin" and file.uploader_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete files uploaded by other family members"
        )
        
    family = current_user.family
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    manager = StorageManager()
    family_config = manager.get_family_config(family, db)
    manager.delete_file(file, family_config, db)
    
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "DELETE_FILE", current_user.id, current_user.family_id, ip, f"Deleted file: {file.filename}")
    
    return None

@router.patch("/{file_id}/move", response_model=schemas.FileResponse)
def move_file(
    file_id: int,
    file_in: schemas.FileMove,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    file = auth.verify_resource_access(
        models.File,
        file_id,
        current_user.family_id,
        db
    )
        
    # Verify destination folder exists
    if file_in.folder_id is not None:
        folder = auth.verify_resource_access(
            models.Folder,
            file_in.folder_id,
            current_user.family_id,
            db
        )

    # Check for duplicate filename in the target folder
    duplicate_file = db.query(models.File).filter(
        models.File.filename == file.filename,
        models.File.folder_id == file_in.folder_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None,
        models.File.id != file.id
    ).first()
    if duplicate_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A file with this name already exists in the destination folder."
        )

    family = current_user.family
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    # Move in cloud storage if already synced
    moved_somewhere = False
    if family.storage_provider != "local":
        try:
            from storage.storage_manager import StorageManager
            from storage import get_storage_provider
            from routers.folders import ensure_folder_cloud_id
            manager = StorageManager()
            family_config = manager.get_family_config(family, db)

            if file.google_drive_file_id:
                try:
                    dest_google_id = ensure_folder_cloud_id(file_in.folder_id, "google", family, db)
                    provider = get_storage_provider("google")
                    provider.move_file(family_config.get("google", {}), file.google_drive_file_id, dest_google_id, db=db)
                    moved_somewhere = True
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to move file in Google Drive: {e}")

            if not moved_somewhere and file.cloud_file_id:
                provider_name = family.storage_provider
                provider = get_storage_provider(provider_name)
                provider_config = family_config.get(provider_name, {})
                dest_cloud_id = ensure_folder_cloud_id(file_in.folder_id, provider_name, family, db)
                provider.move_file(provider_config, file.cloud_file_id, dest_cloud_id, db=db)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to move file in cloud storage: {str(e)}"
            )

    file.folder_id = file_in.folder_id
    db.commit()
    db.refresh(file)
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    dest_name = "Root" if file.folder_id is None else f"Folder ID {file.folder_id}"
    log_action(db, "MOVE_FILE", current_user.id, current_user.family_id, ip, f"Moved file '{file.filename}' to '{dest_name}'")
    
    return serialize_file(file, current_user_id=current_user.id)
