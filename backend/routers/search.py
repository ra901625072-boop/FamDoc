from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models
import schemas
import auth
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("", response_model=List[schemas.FileResponse])
def search_files(
    query: Optional[str] = None,
    file_type: Optional[str] = None,
    folder_id: Optional[int] = None,
    uploader_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Only search within the user's family and exclude soft-deleted files
    db_query = db.query(models.File).options(
        joinedload(models.File.uploader)
    ).filter(
        models.File.family_id == current_user.family_id,
        models.File.deleted_at == None
    )

    # 1. Search by filename
    if query:
        search_pattern = f"%{query}%"
        db_query = db_query.filter(models.File.filename.like(search_pattern))

    # 2. Search by type
    if file_type:
        # Map simple categories to MIME type substrings
        if file_type == "pdf":
            db_query = db_query.filter(models.File.file_type.like("%pdf%"))
        elif file_type == "image":
            db_query = db_query.filter(
                models.File.file_type.like("%image%") | 
                models.File.file_type.like("%png%") | 
                models.File.file_type.like("%jpeg%") | 
                models.File.file_type.like("%jpg%")
            )
        elif file_type == "document":
            db_query = db_query.filter(
                models.File.file_type.like("%word%") | 
                models.File.file_type.like("%officedocument%") | 
                models.File.file_type.like("%pdf%")
            )
        elif file_type == "text":
            db_query = db_query.filter(models.File.file_type.like("%text%"))
        else:
            db_query = db_query.filter(models.File.file_type.like(f"%{file_type}%"))

    # 3. Filter by folder
    if folder_id is not None:
        db_query = db_query.filter(models.File.folder_id == folder_id)

    # 4. Filter by uploader
    if uploader_id is not None:
        db_query = db_query.filter(models.File.uploader_id == uploader_id)

    # 5. Filter by date range
    if start_date:
        db_query = db_query.filter(models.File.upload_date >= start_date)
    if end_date:
        db_query = db_query.filter(models.File.upload_date <= end_date)

    files = db_query.all()

    shared_file_ids = {sl.file_id for sl in db.query(models.SharedLink.file_id).filter(models.SharedLink.family_id == current_user.family_id).all()}

    from serializers import serialize_file
    result = [
        serialize_file(file, is_shared=(file.id in shared_file_ids), current_user_id=current_user.id)
        for file in files
    ]
    return result
