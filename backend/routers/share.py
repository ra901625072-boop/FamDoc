import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth
from typing import List, Optional
from datetime import datetime, timezone
from config import BACKEND_URL
from storage.storage_manager import StorageManager
from utils.audit import log_action
import io
from pydantic import BaseModel

router = APIRouter(tags=["Sharing"])

class SharePasswordVerify(BaseModel):
    password: str

@router.post("/api/files/{file_id}/share", response_model=schemas.ShareLinkResponse, status_code=status.HTTP_201_CREATED)
def create_share_link(
    file_id: int,
    share_in: schemas.ShareLinkCreate,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify file exists, belongs to family, and is active
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Generate a unique token
    token = secrets.token_hex(16)

    # Securely hash password if provided
    pwd_hash = None
    if share_in.password:
        pwd_hash = auth.get_password_hash(share_in.password)

    # Save shared link record
    new_link = models.SharedLink(
        id=token,
        file_id=file_id,
        family_id=current_user.family_id,
        password_hash=pwd_hash,
        expires_at=share_in.expires_at,
        max_downloads=share_in.max_downloads,
        created_by=current_user.id
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)

    # Format the link URL
    base_url = BACKEND_URL or str(request.base_url).rstrip("/")
    share_url = f"{base_url}/shared.html?token={token}"

    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "CREATE_SHARE_LINK", current_user.id, current_user.family_id, ip, f"Created share link for: {file.filename}")

    return {
        "token": new_link.id,
        "file_id": new_link.file_id,
        "share_link": share_url,
        "is_password_protected": pwd_hash is not None,
        "expires_at": new_link.expires_at,
        "max_downloads": new_link.max_downloads,
        "download_count": new_link.download_count,
        "created_at": new_link.created_at
    }

@router.get("/api/files/{file_id}/share", response_model=List[schemas.ShareLinkResponse])
def get_file_share_links(
    file_id: int,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify file belongs to family
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    links = db.query(models.SharedLink).filter(models.SharedLink.file_id == file_id).all()
    base_url = BACKEND_URL or str(request.base_url).rstrip("/")

    return [
        {
            "token": link.id,
            "file_id": link.file_id,
            "share_link": f"{base_url}/shared.html?token={link.id}",
            "is_password_protected": link.password_hash is not None,
            "expires_at": link.expires_at,
            "max_downloads": link.max_downloads,
            "download_count": link.download_count,
            "created_at": link.created_at
        }
        for link in links
    ]

@router.delete("/api/shared/links/{token}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share_link(
    token: str,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    link = db.query(models.SharedLink).filter(
        models.SharedLink.id == token,
        models.SharedLink.family_id == current_user.family_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or unauthorized")

    file_name = link.file.filename if link.file else "unknown"
    db.delete(link)
    db.commit()

    # Audit log
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "REVOKE_SHARE_LINK", current_user.id, current_user.family_id, ip, f"Revoked share link for: {file_name}")

    return None

# ==========================================
# PUBLIC SHARE RETRIEVAL ROUTES (NO AUTH REQUIRED)
# ==========================================

@router.get("/api/shared/{token}")
def get_public_share_info(
    token: str,
    db: Session = Depends(get_db)
):
    link = db.query(models.SharedLink).filter(models.SharedLink.id == token).first()
    if not link or not link.file or link.file.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Shared link not found or expired")

    # Verify expiration
    if link.expires_at:
        expires_at_aware = link.expires_at.replace(tzinfo=timezone.utc) if link.expires_at.tzinfo is None else link.expires_at
        if expires_at_aware < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This shared link has expired")

    # Verify download count limit
    if link.max_downloads and link.download_count >= link.max_downloads:
        raise HTTPException(status_code=410, detail="This shared link has reached its maximum download limit")

    return {
        "filename": link.file.filename,
        "file_type": link.file.file_type,
        "size_bytes": link.file.size_bytes,
        "is_password_protected": link.password_hash is not None,
        "expires_at": link.expires_at
    }

@router.post("/api/shared/{token}/download")
def download_public_shared_file(
    token: str,
    request: Request,
    password_in: Optional[SharePasswordVerify] = None,
    db: Session = Depends(get_db)
):
    from routers.auth import check_rate_limit
    ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(ip)
    
    link = db.query(models.SharedLink).filter(models.SharedLink.id == token).first()
    if not link or not link.file or link.file.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Shared link not found or expired")

    # Verify expiration
    if link.expires_at:
        expires_at_aware = link.expires_at.replace(tzinfo=timezone.utc) if link.expires_at.tzinfo is None else link.expires_at
        if expires_at_aware < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This shared link has expired")

    # Verify download count limit
    if link.max_downloads and link.download_count >= link.max_downloads:
        raise HTTPException(status_code=410, detail="This shared link has reached its maximum download limit")

    # Verify password if protected
    if link.password_hash:
        if not password_in or not password_in.password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password is required for this shared link.")
        if not auth.verify_password(password_in.password, link.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")

    # Retrieve file from storage provider
    file = link.file
    family = db.query(models.Family).filter(models.Family.id == file.family_id).first()

    try:
        provider = get_storage_provider(file.storage_provider)
        config = get_family_storage_config(family, db)
        file_bytes = provider.download_file(config, file.file_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve file from storage provider: {str(e)}"
        )

    # Increment download count
    link.download_count += 1
    db.commit()

    # Write audit log entry (user_id is None because this is public access)
    ip = request.client.host if request.client else "127.0.0.1"
    log_action(db, "DOWNLOAD_SHARED_FILE", None, file.family_id, ip, f"Public download of shared file: {file.filename} (Link token: {token})")

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{file.filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
