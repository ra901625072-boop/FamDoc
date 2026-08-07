from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models
import auth
from sqlalchemy import func

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.family_id:
        return {
            "total_files": 0,
            "total_folders": 0,
            "total_size_bytes": 0,
            "total_members": 1,
            "storage_provider": "local",
            "recent_uploads": [],
            "recent_activity": []
        }

    # 1. Total files (excluding soft-deleted ones)
    total_files = db.query(models.File).filter(
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).count()

    # 2. Total folders (excluding soft-deleted ones)
    total_folders = db.query(models.Folder).filter(
        models.Folder.family_id == current_user.family_id,
        models.Folder.deleted_at == None
    ).count()

    # 3. Storage Used (sum of active file sizes)
    total_size_bytes = db.query(func.sum(models.File.size_bytes)).filter(
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).scalar() or 0

    # 4. Total family members
    total_members = db.query(models.FamilyMember).filter(
        models.FamilyMember.family_id == current_user.family_id
    ).count()

    # 5. Fetch Family Storage Configuration
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
    storage_provider = family.storage_provider if family else "none"

    # 6. Recent Uploads (limit 5, sorted by upload date descending)
    recent_files = db.query(models.File).options(
        joinedload(models.File.uploader)
    ).filter(
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    ).order_by(models.File.upload_date.desc()).limit(5).all()

    shared_file_ids = {sl.file_id for sl in db.query(models.SharedLink.file_id).filter(models.SharedLink.family_id == current_user.family_id).all()}

    from serializers import serialize_file
    recent_uploads = [
        serialize_file(f, is_shared=(f.id in shared_file_ids), current_user_id=current_user.id)
        for f in recent_files
    ]

    # 7. Recent Activity (limit 10, sorted by timestamp descending)
    recent_logs = db.query(models.AuditLog).options(
        joinedload(models.AuditLog.user)
    ).filter(
        models.AuditLog.family_id == current_user.family_id
    ).order_by(models.AuditLog.timestamp.desc()).limit(10).all()

    recent_activity = [
        {
            "id": log.id,
            "action": log.action,
            "timestamp": log.timestamp,
            "user_id": log.user_id,
            "user_email": log.user.email if log.user else None,
            "username": log.user.username if log.user else None,
            "ip_address": log.ip_address,
            "details": log.details
        }
        for log in recent_logs
    ]

    return {
        "total_files": total_files,
        "total_folders": total_folders,
        "total_size_bytes": total_size_bytes,
        "total_members": total_members,
        "storage_provider": storage_provider,
        "recent_uploads": recent_uploads,
        "recent_activity": recent_activity
    }
