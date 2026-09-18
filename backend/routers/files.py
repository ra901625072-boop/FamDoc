import io
import re
import os
import mimetypes
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
import auth
from sqlalchemy.orm import joinedload
from utils.audit import log_action
from utils.ip import get_client_ip
from serializers import serialize_file
from datetime import datetime, timezone
from storage.storage_manager import StorageManager
from cache import folder_listing_cache, invalidate_family_caches
from config import MAX_FILE_SIZE_MB

SAFE_FILENAME_PATTERN = re.compile(r'^[\w\-. ()\[\]]+$', re.UNICODE)

# Comprehensive format registries
VIDEO_EXTENSIONS = {
    ".mp4", ".m4v", ".webm", ".mkv", ".mov", ".qt", ".avi", ".wmv",
    ".asf", ".flv", ".f4v", ".3gp", ".3g2", ".mpg", ".mpeg", ".mpe",
    ".mp2", ".m1v", ".m2v", ".ts", ".mts", ".m2ts", ".ogv", ".vob",
    ".rm", ".rmvb", ".divx", ".h264", ".h265", ".hevc"
}
DOCUMENT_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".txt", ".pptx", ".ppt", ".csv"
}
IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp", ".tiff", ".ico"
}
ALLOWED_EXTENSIONS = DOCUMENT_EXTENSIONS | IMAGE_EXTENSIONS | VIDEO_EXTENSIONS

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
    elif ext in (".docx", ".xlsx", ".pptx"):
        # Office XML format (ZIP container)
        return content.startswith(b"PK\x03\x04")
    elif ext in (".doc", ".xls", ".ppt"):
        # Compound File Binary Format (OLE2)
        return content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    elif ext == ".txt":
        # Text files: try to decode as UTF-8 or ASCII
        try:
            content[:4096].decode("utf-8")
            return True
        except UnicodeDecodeError:
            return False
    elif ext in VIDEO_EXTENSIONS:
        # Check against common dangerous script/executable signatures
        if content.startswith(b"MZ") or content.startswith(b"\x7fELF") or content.startswith(b"#!/") or content.startswith(b"<?php") or content.startswith(b"<html") or content.startswith(b"<!DOCTYPE"):
            return False

        # ISO Base Media File Format (MP4 / QuickTime / 3GP / M4V)
        if ext in (".mp4", ".m4v", ".mov", ".qt", ".3gp", ".3g2"):
            if len(content) >= 8:
                box_type = content[4:8]
                if box_type in (b"ftyp", b"moov", b"wide", b"mdat", b"free", b"skip", b"pnot", b"styp", b"meta", b"uuid"):
                    return True
            # Scan first 256 bytes for common ISO/QuickTime atom identifiers
            header_sample = content[:256]
            if any(atom in header_sample for atom in (b"ftyp", b"moov", b"mdat", b"wide", b"styp", b"free", b"skip", b"pnot", b"qt  ")):
                return True
            return False

        elif ext in (".mkv", ".webm"):
            return content.startswith(b"\x1a\x45\xdf\xa3")
        elif ext in (".avi", ".divx"):
            return content.startswith(b"RIFF") and len(content) >= 12 and content[8:12] in (b"AVI ", b"AVIX")
        elif ext in (".wmv", ".asf"):
            return content.startswith(b"\x30\x26\xb2\x75\x8e\x66\xcf\x11\xa6\xd9\x00\xaa\x00\x62\xce\x6c")
        elif ext in (".flv", ".f4v"):
            return content.startswith(b"FLV")
        elif ext in (".mpg", ".mpeg", ".mpe", ".m1v", ".m2v", ".vob"):
            return content.startswith(b"\x00\x00\x01\xba") or content.startswith(b"\x00\x00\x01\xb3")
        elif ext in (".ts", ".mts", ".m2ts"):
            return content.startswith(b"\x47")
        elif ext == ".ogv":
            return content.startswith(b"OggS")
        elif ext in (".rm", ".rmvb"):
            return content.startswith(b".RMF") or content.startswith(b".ra\xfd")
        return True
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

    # Check cache first for faster repeated access
    cache_key = f"files:{current_user.family_id}:{folder_id}"
    cached_result = folder_listing_cache.get(cache_key)
    if cached_result is not None:
        return cached_result
    
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
    
    # Cache the result for subsequent requests
    folder_listing_cache.set(cache_key, result)
        
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
        auth.verify_resource_access(
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
    _, ext = os.path.splitext(file.filename.lower())
    detected_mime, _ = mimetypes.guess_type(file.filename)
    is_video_mime = (file.content_type and file.content_type.lower().startswith("video/")) or (detected_mime and detected_mime.lower().startswith("video/"))
    if ext not in ALLOWED_EXTENSIONS and not is_video_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Supported formats: PDF, Word, Excel, Images, Videos, and TXT."
        )

    if not SAFE_FILENAME_PATTERN.match(file.filename) or len(file.filename) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename contains unsupported characters. Use only letters, numbers, spaces, and ._-()[]."
        )

    # Check upfront Content-Length header to reject oversized requests immediately
    MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File size exceeds the maximum limit of {MAX_FILE_SIZE_MB}MB."
                )
        except ValueError:
            pass

    # Read initial chunk to inspect magic bytes signature before reading entire payload
    initial_chunk = await file.read(8192)
    if not initial_chunk:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # Enforce file content verification (magic bytes check)
    if not validate_file_content_signature(initial_chunk, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match the file extension signature."
        )

    # Stream remaining payload in chunks enforcing maximum size constraint
    CHUNK_SIZE = 64 * 1024
    chunks = [initial_chunk]
    total_bytes = len(initial_chunk)
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds the maximum limit of {MAX_FILE_SIZE_MB}MB."
            )
        chunks.append(chunk)

    content = b"".join(chunks)
    del chunks
    file_size = total_bytes

    # Resolve accurate MIME content type
    resolved_file_type = file.content_type
    if not resolved_file_type or resolved_file_type == "application/octet-stream":
        if detected_mime:
            resolved_file_type = detected_mime
        else:
            resolved_file_type = "application/octet-stream"

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

    effective_quota = family.storage_quota_bytes
    if family.storage_provider == "google":
        active_accts = db.query(models.StorageAccount).filter(
            models.StorageAccount.family_id == family.id,
            models.StorageAccount.status == "active"
        ).all()
        acct_total = sum(a.cached_quota_total for a in active_accts if a.cached_quota_total)
        if acct_total > 0:
            effective_quota = acct_total

    if effective_quota and (used_bytes + file_size > effective_quota):
        if effective_quota >= 1024 * 1024 * 1024:
            quota_str = f"{effective_quota / (1024 * 1024 * 1024):.1f} GB"
        else:
            quota_str = f"{effective_quota / (1024 * 1024):.1f} MB"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Storage quota exceeded. Your family is allowed up to {quota_str} of total vault storage."
        )

    manager = StorageManager()
    family_config = manager.get_family_config(family, db)
    provider = family.storage_provider or "local"

    upload_success = False
    cloud_result = None
    selected_account = None

    if provider == "google":
        manager.initialize_family_storage(family, db)

        # Check if active accounts exist and whether any account has enough capacity
        # Use the load-balancing algorithm to pick the best drive
        selected_account = manager.select_target_account(family, file_size, db)
        if not selected_account:
            active_accts = db.query(models.StorageAccount).filter(
                models.StorageAccount.family_id == family.id,
                models.StorageAccount.status == "active"
            ).all()
            if active_accts:
                # All active accounts have known limits, and none can fit this file
                max_free = 0
                for a in active_accts:
                    free = manager._get_or_refresh_free_space(a, db)
                    if free and free > max_free:
                        max_free = free

                def _fmt(b):
                    if b >= 1024 * 1024 * 1024:
                        return f"{b / (1024 * 1024 * 1024):.1f} GB"
                    elif b >= 1024 * 1024:
                        return f"{b / (1024 * 1024):.1f} MB"
                    elif b >= 1024:
                        return f"{b / 1024:.1f} KB"
                    return f"{b} bytes"

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"File '{file.filename}' ({_fmt(file_size)}) cannot be uploaded. "
                        f"No single Google Drive account has sufficient free space (largest available space on a single drive is {_fmt(max_free)}). "
                        "Google Drive does not allow splitting a single file across multiple accounts."
                    )
                )

        if selected_account:
            try:
                target_config = manager.get_account_config(selected_account)
                
                # Resolve folder tree on the TARGET account's Drive
                target_vault_id = manager.ensure_folder_for_account(
                    folder_id, selected_account, family, db
                )

                cloud_result = manager.providers[provider].upload_file(
                    config=target_config,
                    vault_folder_id=target_vault_id,
                    filename=file.filename,
                    file_content=content,
                    mimetype=resolved_file_type,
                    username=None,
                    db=db
                )
                upload_success = True
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Direct cloud upload to {provider} failed: {e}. Falling back to local storage and background sync.")
                upload_success = False

    if upload_success and cloud_result:
        # Update cached quota immediately so next upload sees accurate data
        if selected_account:
            selected_account.cached_quota_used = (selected_account.cached_quota_used or 0) + file_size
            db.add(selected_account)

        db_file = models.File(
            filename         = file.filename,
            file_type        = resolved_file_type,
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
            backup_status    = "none",
            storage_account_id = selected_account.id if selected_account else None
        )
    else:
        local_config = family_config.get("local", {})
        result = manager.write_file(
            content      = content,
            filename     = file.filename,
            mimetype     = resolved_file_type,
            local_config = local_config,
        )
        
        now = datetime.now(timezone.utc)
        db_file = models.File(
            filename         = file.filename,
            file_type        = resolved_file_type,
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
            backup_status    = "none",
            storage_account_id = selected_account.id if selected_account else None
        )

    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    # Audit log
    ip = get_client_ip(request)
    log_action(db, "UPLOAD_FILE", current_user.id, current_user.family_id, ip, f"Uploaded file: {db_file.filename} ({db_file.size_bytes} bytes)")

    invalidate_family_caches(current_user.family_id)

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
    ip = get_client_ip(request)
    log_action(db, "DOWNLOAD_FILE", current_user.id, current_user.family_id, ip, f"Downloaded file: {file.filename}")
    
    manager = StorageManager()
    family_config = manager.get_family_config(family, db)

    filename = file.filename
    try:
        content = manager.read_file(file, family_config, db=db)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    finally:
        db.close()

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Accept-Ranges": "bytes"
        }
    )

@router.get("/{file_id}/preview")
def preview_file(
    file_id: int,
    request: Request,
    thumbnail: bool = False,
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
    ip = get_client_ip(request)
    log_action(db, "PREVIEW_FILE", current_user.id, current_user.family_id, ip, f"Previewed file: {file.filename}")
    
    manager = StorageManager()
    family_config = manager.get_family_config(family, db)

    filename = file.filename
    file_type = file.file_type
    
    # Optimization 1: For Google Drive thumbnails, stream the pre-rendered thumbnail directly
    if thumbnail and file.storage_provider == "google":
        try:
            generator = manager.stream_thumbnail(file, family_config, db=db)
            if generator:
                db.close()
                response_headers = {
                    "Content-Disposition": f'inline; filename="thumb_{filename}.jpg"',
                    "Cache-Control": "public, max-age=604800"
                }
                return StreamingResponse(
                    generator,
                    media_type="image/jpeg",
                    headers=response_headers
                )
        except Exception:
            pass

    if thumbnail:
        try:
            content = manager.read_file(file, family_config, db=db)
            
            # Optimize image thumbnails to maximum 320x320 bounding box with Lanczos filtering & quality 72
            if file_type and file_type.lower().startswith("image/"):
                try:
                    from PIL import Image, ImageOps
                    img = Image.open(io.BytesIO(content))
                    
                    # Auto-orient based on EXIF tag if present
                    try:
                        img = ImageOps.exif_transpose(img)
                    except Exception:
                        pass

                    # Convert RGBA/Palette/LA to RGB for clean JPEG compression
                    if img.mode in ("RGBA", "LA", "P"):
                        background = Image.new("RGB", img.size, (255, 255, 255))
                        if img.mode == "P":
                            img = img.convert("RGBA")
                        background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
                        img = background
                    elif img.mode != "RGB":
                        img = img.convert("RGB")

                    # Downsample preserving aspect ratio within 320x320 bounding box
                    resample_filter = getattr(Image, "Resampling", Image).LANCZOS
                    img.thumbnail((320, 320), resample_filter)
                    
                    out = io.BytesIO()
                    img.save(out, format="JPEG", quality=72, optimize=True)
                    content = out.getvalue()
                    file_type = "image/jpeg"
                except Exception:
                    pass
            elif file_type and (file_type.lower() == "application/pdf" or file_type.lower().startswith("video/")):
                # PDF/Video thumbnail generation fallback is not supported without pre-rendered thumbnails
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Thumbnail generation not available for this file type. Fallback to default icon."
                )
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail=str(e))
        finally:
            db.close()

        etag = f'"thumb-{file.id}-{len(content)}"'
        response_headers = {
            "Content-Disposition": f'inline; filename="thumb_{filename}.jpg"',
            "Cache-Control": "public, max-age=2592000, immutable",
            "ETag": etag
        }
        return StreamingResponse(
            io.BytesIO(content),
            media_type=file_type or "image/jpeg",
            headers=response_headers
        )
    else:
        range_header = request.headers.get("range")
        try:
            stream_result, provider_used = manager.stream_file(file, family_config, db=db, range_header=range_header)
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail=str(e))
        finally:
            db.close()

        if isinstance(stream_result, tuple):
            generator, start, end, total = stream_result
        else:
            generator, start, end, total = stream_result, None, None, None

        response_headers = {
            "Content-Disposition": f'inline; filename="{filename}"',
            "Accept-Ranges": "bytes"
        }

        status_code = 200
        if start is not None and end is not None:
            status_code = 206
            total_str = total if total is not None else file.size_bytes
            response_headers["Content-Range"] = f"bytes {start}-{end}/{total_str}"
            response_headers["Content-Length"] = str(end - start + 1)
        elif total is not None:
            response_headers["Content-Length"] = str(total)
        elif file.size_bytes:
            response_headers["Content-Length"] = str(file.size_bytes)

        return StreamingResponse(
            generator,
            status_code=status_code,
            media_type=file_type or "application/octet-stream",
            headers=response_headers
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
                cfg = manager.resolve_file_account_config(file, db)
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
    
    ip = get_client_ip(request)
    log_action(db, "RENAME_FILE", current_user.id, current_user.family_id, ip, f"Renamed file '{old_name}' to '{new_name}'")
    
    invalidate_family_caches(current_user.family_id)
    
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
    
    ip = get_client_ip(request)
    log_action(db, "DELETE_FILE", current_user.id, current_user.family_id, ip, f"Deleted file: {file.filename}")
    
    invalidate_family_caches(current_user.family_id)
    
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
        auth.verify_resource_access(
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
            manager = StorageManager()
            family_config = manager.get_family_config(family, db)

            if file.google_drive_file_id:
                try:
                    # Use the file's own account credentials and resolve folder on that account
                    cfg = manager.resolve_file_account_config(file, db)
                    # Resolve the destination folder's storage account
                    if file.storage_account_id:
                        from models import StorageAccount
                        file_acct = db.query(StorageAccount).get(file.storage_account_id)
                        if file_acct and file_acct.status in ("active", "disconnecting"):
                            dest_google_id = manager.ensure_folder_for_account(
                                file_in.folder_id, file_acct, family, db
                            )
                        else:
                            from routers.folders import ensure_folder_cloud_id
                            dest_google_id = ensure_folder_cloud_id(file_in.folder_id, "google", family, db)
                    else:
                        from routers.folders import ensure_folder_cloud_id
                        dest_google_id = ensure_folder_cloud_id(file_in.folder_id, "google", family, db)
                    provider = get_storage_provider("google")
                    provider.move_file(cfg, file.google_drive_file_id, dest_google_id, db=db)
                    moved_somewhere = True
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to move file in Google Drive: {e}")

            if not moved_somewhere and file.cloud_file_id:
                provider_name = family.storage_provider
                provider = get_storage_provider(provider_name)
                provider_config = family_config.get(provider_name, {})
                from routers.folders import ensure_folder_cloud_id
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
    ip = get_client_ip(request)
    dest_name = "Root" if file.folder_id is None else f"Folder ID {file.folder_id}"
    log_action(db, "MOVE_FILE", current_user.id, current_user.family_id, ip, f"Moved file '{file.filename}' to '{dest_name}'")
    
    invalidate_family_caches(current_user.family_id)
    
    return serialize_file(file, current_user_id=current_user.id)
