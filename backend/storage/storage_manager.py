"""
StorageManager — local-first upload, silent background cloud promotion.

All write operations go to local storage first.
Cloud promotion is handled exclusively by sync_pending_files(),
which is called by the background worker in main.py.
"""

import os
import threading
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from config import MEGA_EMAIL, MEGA_PASSWORD, GOOGLE_SERVICE_ACCOUNT_FILE, GOOGLE_FOLDER_ID

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Availability cache (module-level, shared across all StorageManager instances)
# ---------------------------------------------------------------------------
_availability_cache: dict = {}
_cache_lock = threading.Lock()


class StorageManager:
    def __init__(self):
        from storage.google_drive_provider import GoogleDriveProvider
        from storage.mega_provider import MegaProvider
        from storage.local import LocalStorageProvider

        self.providers = {
            "google": GoogleDriveProvider(),
            "mega":   MegaProvider(),
            "local":  LocalStorageProvider(),
        }

    def check_availability(self, config: dict, cache_ttl: int = 30, db = None) -> dict:
        """
        Returns { "google": bool, "mega": bool }.
        """
        import json
        import hashlib

        now = datetime.now(timezone.utc).timestamp()

        # Normalize config to use as a partition-safe cache key
        config_str = json.dumps(config, sort_keys=True, default=str)
        cache_key = hashlib.md5(config_str.encode()).hexdigest()

        with _cache_lock:
            cached_entry = _availability_cache.get(cache_key)
            if cached_entry:
                cached_result, cached_ts = cached_entry
                if (now - cached_ts) < cache_ttl:
                    return cached_result

        result = {
            "google": self.providers["google"].health_check(config.get("google", {}), db=db),
            "mega":   self.providers["mega"].health_check(config.get("mega", {})),
        }

        with _cache_lock:
            _availability_cache[cache_key] = (result, now)

        return result

    def write_file(
        self,
        content:      bytes,
        filename:     str,
        mimetype:     str,
        local_config: dict,
    ) -> dict:
        """Writes file content to local storage."""
        try:
            vault_folder_id = local_config.get("vault_folder_id")
            result = self.providers["local"].upload_file(
                config=local_config,
                vault_folder_id=vault_folder_id,
                filename=filename,
                file_content=content,
                mimetype=mimetype,
            )
            return {
                "operation":      "write",
                "status":         "success",
                "tier":           "local",
                "file_id":        result["cloud_file_id"],
                "pending_sync":   True,
                "timestamp":      datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error({
                "error":     str(e),
                "service":   "local",
                "operation": "write",
                "filename":  filename,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            raise

    def read_file(self, file, family_config: dict, db = None) -> bytes:
        provider_name = file.storage_provider or "local"
        cascade_order = self._cascade_from(provider_name)

        for p_name in cascade_order:
            try:
                cfg = family_config.get(p_name, {})
                f_id = file.local_file_id if p_name == "local" else file.cloud_file_id
                if not f_id:
                    continue
                content = self.providers[p_name].download_file(cfg, f_id, db=db)
                return content
            except Exception as e:
                logger.warning({
                    "message":   "File not found or unreachable on provider, trying next",
                    "error":     str(e),
                    "service":   p_name,
                    "file_id":   file.file_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

        raise FileNotFoundError(
            f"File '{file.filename}' is temporarily unavailable. "
            "It may still be syncing to cloud storage. Please try again shortly."
        )

    def _cascade_from(self, provider: str) -> list:
        full_order = ["google", "mega", "local"]
        if provider not in full_order:
            return ["local"]
        idx = full_order.index(provider)
        return full_order[idx:] + full_order[:idx]

    def sync_pending_files(
        self,
        db: Session,
        family_configs: dict,
        batch_size:     int = 50,
    ) -> dict:
        import uuid
        import socket
        from models import File
        from sqlalchemy import or_, and_

        now_utc = datetime.now(timezone.utc)
        timeout_limit = now_utc - timedelta(minutes=10)
        
        # Unique identifier for this thread/process worker
        current_holder = f"worker-{socket.gethostname()}-{threading.get_ident()}-{uuid.uuid4().hex[:8]}"

        # Retrieve files that are pending sync and either not locked, or locked for more than 10 minutes
        pending_files = (
            db.query(File)
            .filter(
                File.pending_sync == True,
                File.deleted_at == None,
                File.sync_retry_count < 5,
                or_(
                    File.lock_acquired_at == None,
                    File.lock_acquired_at < timeout_limit
                )
            )
            .order_by(File.pending_sync_at.asc())
            .limit(batch_size)
            .all()
        )

        synced  = 0
        failed  = 0
        skipped = 0

        for file in pending_files:
            # Atomic leasing attempt: try to update the lock columns if they haven't changed
            leased_rows = db.query(File).filter(
                File.id == file.id,
                File.pending_sync == True,
                File.deleted_at == None,
                or_(
                    File.lock_acquired_at == None,
                    File.lock_acquired_at < timeout_limit
                )
            ).update({
                "lock_acquired_at": datetime.now(timezone.utc),
                "lock_holder": current_holder
            }, synchronize_session=False)

            db.commit()

            if leased_rows == 0:
                # File was leased by another process/thread in the split second between query and update
                skipped += 1
                continue

            config = family_configs.get(file.family_id, {})
            availability = self.check_availability(config, db=db)

            if availability.get("google"):
                target = "google"
            elif availability.get("mega"):
                target = "mega"
            else:
                skipped += 1
                logger.warning({
                    "message":   "All cloud providers unavailable, releasing lease",
                    "file_id":   file.file_id,
                    "family_id": file.family_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                # Release the lease so other workers can try later when providers come back online
                db.query(File).filter(File.id == file.id).update({
                    "lock_acquired_at": None,
                    "lock_holder": None
                }, synchronize_session=False)
                db.commit()
                continue

            try:
                local_config = config.get("local", {})
                local_content = self.providers["local"].download_file(
                    local_config, file.local_file_id, db=db
                )

                uploader_username = file.uploader.username if file.uploader else None
                target_config = config.get(target, {})
                
                if file.folder_id is not None:
                    from routers.folders import ensure_folder_cloud_id
                    target_vault_id = ensure_folder_cloud_id(file.folder_id, file.family, db)
                    target_username = None
                else:
                    target_vault_id = file.family.vault_folder_id
                    target_username = uploader_username

                cloud_result = self.providers[target].upload_file(
                    config=target_config,
                    vault_folder_id=target_vault_id,
                    filename=file.filename,
                    file_content=local_content,
                    mimetype=file.file_type or "application/octet-stream",
                    username=target_username,
                    db=db
                )

                old_local_file_id     = file.local_file_id
                # Phase 1: Mark cloud upload complete but keep local reference
                file.cloud_file_id    = cloud_result["cloud_file_id"]
                file.cloud_link       = cloud_result.get("cloud_link")
                file.storage_provider = target
                file.pending_sync     = False
                file.pending_sync_at  = None
                file.synced_to        = target
                # Clear task lease locks
                file.lock_acquired_at = None
                file.lock_holder      = None
                file.sync_retry_count = 0
                db.commit()

                # Phase 2: Perform local deletion and clear local reference
                try:
                    self.providers["local"].delete_file(local_config, old_local_file_id, db=db)
                    file.local_file_id = None
                    db.commit()
                except Exception as del_err:
                    logger.warning({
                        "message":       "Local copy delete failed after cloud upload",
                        "error":         str(del_err),
                        "local_file_id": old_local_file_id,
                        "cloud_file_id": file.cloud_file_id,
                        "timestamp":     datetime.now(timezone.utc).isoformat(),
                    })

                synced += 1
                logger.info({
                    "action":      "synced",
                    "destination": target,
                    "file_id":     file.file_id,
                    "family_id":   file.family_id,
                    "filename":    file.filename,
                    "timestamp":   datetime.now(timezone.utc).isoformat(),
                })

            except Exception as e:
                db.rollback()
                failed += 1
                logger.error({
                    "error":     str(e),
                    "service":   target,
                    "file_id":   file.file_id,
                    "family_id": file.family_id,
                    "filename":  file.filename,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                # Release the lease, increment retry count
                db.query(File).filter(File.id == file.id).update({
                    "lock_acquired_at": None,
                    "lock_holder": None,
                    "sync_retry_count": File.sync_retry_count + 1
                }, synchronize_session=False)
                db.commit()

        return {
            "synced":  synced,
            "failed":  failed,
            "skipped": skipped,
            "total":   len(pending_files),
        }

    def delete_file(self, file, family_config: dict, db: Session) -> dict:
        file.deleted_at   = datetime.now(timezone.utc)
        file.pending_sync = False
        db.commit()
        return {
            "operation": "delete",
            "status":    "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def recover_interrupted_syncs(self, db: Session):
        """
        Scan and clean up any remaining local copies of files that have
        already been successfully synced and committed to the cloud.
        """
        from models import File
        interrupted_files = db.query(File).filter(
            File.storage_provider != "local",
            File.local_file_id != None
        ).all()
        
        if not interrupted_files:
            return
            
        logger.info(f"Sync Recovery: Found {len(interrupted_files)} files with pending local cleanup.")
        for file in interrupted_files:
            try:
                local_config = self.get_family_config(file.family, db).get("local", {})
                self.providers["local"].delete_file(local_config, file.local_file_id, db=db)
                logger.info(f"Sync Recovery: Successfully deleted local copy {file.local_file_id} for file {file.filename}")
            except Exception as e:
                logger.warning(f"Sync Recovery: Failed to delete local copy {file.local_file_id}: {e}")
            
            file.local_file_id = None
        db.commit()

    def initialize_family_storage(self, family, db: Session):
        # 1. Try Google Drive if configured
        if family.storage_provider == "google" and family.vault_folder_id:
            return
            
        has_google_config = False
        google_config = {}
        if family.storage_provider == "google" and family.storage_config and family.storage_config.get("folder_id"):
            google_config = family.storage_config
            has_google_config = True
        elif GOOGLE_FOLDER_ID:
            google_config = {"folder_id": GOOGLE_FOLDER_ID}
            has_google_config = True
            
        sa_exists = False
        sa_file = GOOGLE_SERVICE_ACCOUNT_FILE or "service-account.json"
        if not os.path.isabs(sa_file):
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            sa_file = os.path.join(backend_dir, sa_file)
        if os.path.exists(sa_file):
            sa_exists = True

        if has_google_config and sa_exists:
            try:
                vault_id = self.providers["google"].ensure_vault_folder(family.id, google_config, db=db)
                
                family.storage_provider = "google"
                family.vault_folder_id = vault_id
                family.storage_config = google_config
                db.commit()
                return
            except Exception as google_err:
                print(f"Warning: Failed to initialize Google Drive Provider for family {family.id}: {str(google_err)}")

        # 2. Try Mega if configured
        if family.storage_provider == "mega" and family.vault_folder_id:
            return
            
        mega_config = {}
        has_mega_config = False
        if family.storage_provider == "mega" and family.storage_config and family.storage_config.get("email"):
            mega_config = family.storage_config
            has_mega_config = True
        elif MEGA_EMAIL and MEGA_PASSWORD:
            mega_config = {
                "email": MEGA_EMAIL,
                "password": MEGA_PASSWORD
            }
            has_mega_config = True

        if has_mega_config:
            try:
                vault_id = self.providers["mega"].ensure_vault_folder(family.id, mega_config)
                
                family.storage_provider = "mega"
                family.vault_folder_id = vault_id
                family.storage_config = mega_config
                db.commit()
                return
            except Exception as mega_err:
                print(f"Warning: Failed to initialize Mega Provider for family {family.id}: {str(mega_err)}")
                
        # 3. Fallback to Local Storage
        if family.storage_provider == "local" and family.vault_folder_id:
            return
            
        vault_id = self.providers["local"].ensure_vault_folder(family.id, {})
        
        family.storage_provider = "local"
        family.vault_folder_id = vault_id
        family.storage_config = {"vault_folder_id": vault_id}
        db.commit()

    def get_family_config(self, family, db: Session) -> dict:
        self.initialize_family_storage(family, db)
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "local_vault"))
        
        # Build local config
        local_cfg = {"vault_folder_id": os.path.join(base_dir, family.id)}
        
        # Build mega config
        mega_cfg = {}
        if family.storage_provider == "mega" and family.storage_config:
            mega_cfg = family.storage_config.copy()
        if MEGA_EMAIL and "email" not in mega_cfg:
            mega_cfg["email"] = MEGA_EMAIL
        if MEGA_PASSWORD and "password" not in mega_cfg:
            mega_cfg["password"] = MEGA_PASSWORD
            
        # Build google config
        google_cfg = {}
        if family.storage_provider == "google" and family.storage_config:
            google_cfg = family.storage_config.copy()
        if GOOGLE_FOLDER_ID and "folder_id" not in google_cfg:
            google_cfg["folder_id"] = GOOGLE_FOLDER_ID

        return {
            "local": local_cfg,
            "mega": mega_cfg,
            "google": google_cfg,
        }

    def get_file_config(self, file, db: Session) -> dict:
        family_cfg = self.get_family_config(file.family, db)
        provider = file.storage_provider or "local"
        return family_cfg.get(provider, {})
