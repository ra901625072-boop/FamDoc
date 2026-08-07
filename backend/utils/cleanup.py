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
            try:
                manager = StorageManager()
                provider = manager.providers.get(file.storage_provider or "local")
                config = manager.get_file_config(file, db)
                if provider:
                    provider.delete_file(config, file.file_id, db=db)
                logger.info(f"Cleanup Job: Purged file {file.file_id} for {file.filename}")
            except Exception as e:
                logger.warning(f"Warning: Cleanup Job failed to delete file {file.file_id} ({file.filename}): {e}")
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
