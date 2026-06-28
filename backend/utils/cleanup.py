from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import models
from storage import get_storage_provider
from storage.storage_manager import StorageManager
from logging_config import logger

def purge_old_recycle_bin_items(db: Session, retention_days: int = 30):
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    
    # 1. Query files soft-deleted before the cutoff
    old_files = db.query(models.File).filter(
        models.File.deleted_at != None,
        models.File.deleted_at < cutoff
    ).all()
    
    if old_files:
        logger.info(f"Cleanup Job: Found {len(old_files)} soft-deleted files older than {retention_days} days to purge.")
        for file in old_files:
            family = db.query(models.Family).filter(models.Family.id == file.family_id).first()
            if family:
                try:
                    provider = get_storage_provider(file.storage_provider)
                    config = get_file_storage_config(file, family, db)
                    provider.delete_file(config, file.file_id)
                    logger.info(f"Cleanup Job: Purged cloud file {file.file_id} for {file.filename}")
                except Exception as e:
                    logger.warning(f"Warning: Cleanup Job failed to delete cloud file {file.file_id} ({file.filename}): {e}")
            db.delete(file)
        db.commit()

    # 2. Query folders soft-deleted before the cutoff
    old_folders = db.query(models.Folder).filter(
        models.Folder.deleted_at != None,
        models.Folder.deleted_at < cutoff
    ).all()
    
    if old_folders:
        logger.info(f"Cleanup Job: Found {len(old_folders)} soft-deleted folders older than {retention_days} days to purge.")
        for folder in old_folders:
            db.delete(folder)
        db.commit()
