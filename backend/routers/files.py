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
router = APIRouter(prefix="/api/files", tags=["Files"])

@router.get("", response_model=List[schemas.FileResponse])
def get_files(
    background_tasks: BackgroundTasks,
    folder_id: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
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
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    # Validate parent folder if provided
    if folder_id is not None:
        folder = db.query(models.Folder).filter(
            models.Folder.id == folder_id,
            models.Folder.family_id == current_user.family_id
        ).first()
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target folder not found")

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

    # Resolve local storage config for this family
    family_config = manager.get_family_config(family, db)
    local_config  = family_config.get("local", {})

    # Write to local storage — always instant
    result = manager.write_file(
        content      = content,
        filename     = file.filename,
        mimetype     = file.content_type or "application/octet-stream",
        local_config = local_config,
    )

    # Persist DB record with pending_sync=True
    now     = datetime.now(timezone.utc)
    db_file = models.File(
        filename         = file.filename,
        file_type        = file.content_type or "application/octet-stream",
        size_bytes       = file_size,
        _file_id         = result["file_id"], # Legacy column fallback to satisfy NOT NULL constraint
        local_file_id    = result["file_id"],
        cloud_file_id    = None,
        folder_id        = folder_id,
        family_id        = current_user.family_id,
        uploader_id      = current_user.id,
        storage_provider = "local",
        pending_sync     = True,
        pending_sync_at  = now,
        synced_to        = None,
        cloud_link       = None
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
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        
    token = auth.create_file_access_token(file.id, current_user.id)
    return {"token": token}

@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user_or_file_preview),
    db: Session = Depends(get_db)
):
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "DOWNLOAD_FILE", current_user.id, current_user.family_id, ip, f"Downloaded file: {file.filename}")
    
    manager = StorageManager()
    family_config = manager.get_family_config(family, db)

    try:
        content = manager.read_file(file, family_config)
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
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "PREVIEW_FILE", current_user.id, current_user.family_id, ip, f"Previewed file: {file.filename}")
    
    manager = StorageManager()
    family_config = manager.get_family_config(family, db)

    try:
        content = manager.read_file(file, family_config)
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
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        
    if current_user.role != "admin" and file.uploader_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to rename files uploaded by other family members"
        )
        
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
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
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        
    if current_user.role != "admin" and file.uploader_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete files uploaded by other family members"
        )
        
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
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
    file = db.query(models.File).options(joinedload(models.File.uploader)).filter(
        models.File.id == file_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        
    # Verify destination folder exists
    if file_in.folder_id is not None:
        folder = db.query(models.Folder).filter(
            models.Folder.id == file_in.folder_id,
            models.Folder.family_id == current_user.family_id,
            models.Folder.deleted_at == None
        ).first()
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination folder not found")

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

    file.folder_id = file_in.folder_id
    db.commit()
    db.refresh(file)
    
    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    dest_name = "Root" if file.folder_id is None else f"Folder ID {file.folder_id}"
    log_action(db, "MOVE_FILE", current_user.id, current_user.family_id, ip, f"Moved file '{file.filename}' to '{dest_name}'")
    
    return serialize_file(file, current_user_id=current_user.id)
