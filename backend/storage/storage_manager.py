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
                f_id = None
                if p_name == "local":
                    f_id = file.local_file_id or (file._file_id if file.storage_provider == "local" or not file.storage_provider else None)
                elif p_name == "google":
                    f_id = file.google_drive_file_id or (file.cloud_file_id if file.storage_provider == "google" else None) or (file._file_id if file.storage_provider == "google" else None)
                elif p_name == "mega":
                    f_id = file.mega_file_id or (file.cloud_file_id if file.storage_provider == "mega" else None) or (file._file_id if file.storage_provider == "mega" else None)

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
        from routers.folders import ensure_folder_cloud_id

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
            provider = config.get("storage_provider", "local")
            storage_mode = config.get("storage_mode", "failover")
            primary_provider = config.get("primary_provider", "google")
            backup_provider = "mega" if primary_provider == "google" else "google"
            
            mimetype = file.file_type or "application/octet-stream"

            if provider == "dual":
                if storage_mode == "mirror":
                    # Check what needs syncing
                    google_needed = not bool(file.google_drive_file_id)
                    mega_needed = not bool(file.mega_file_id)
                    
                    if not google_needed and not mega_needed:
                        # Already fully mirrored
                        file.pending_sync = False
                        file.pending_sync_at = None
                        file.lock_acquired_at = None
                        file.lock_holder = None
                        db.commit()
                        synced += 1
                        continue

                    # Check availability
                    availability = self.check_availability(config, db=db)
                    google_avail = availability.get("google") and google_needed
                    mega_avail = availability.get("mega") and mega_needed
                    
                    if not google_avail and not mega_avail:
                        skipped += 1
                        db.query(File).filter(File.id == file.id).update({
                            "lock_acquired_at": None,
                            "lock_holder": None
                        }, synchronize_session=False)
                        db.commit()
                        continue
                        
                    # Succeeded to find at least one provider to sync
                    try:
                        local_config = config.get("local", {})
                        local_content = self.providers["local"].download_file(
                            local_config, file.local_file_id, db=db
                        )
                    except Exception as e:
                        logger.error(f"Failed to download local file for sync: {e}")
                        db.query(File).filter(File.id == file.id).update({
                            "lock_acquired_at": None,
                            "lock_holder": None,
                            "sync_retry_count": File.sync_retry_count + 1
                        }, synchronize_session=False)
                        db.commit()
                        failed += 1
                        continue

                    # Sync to Google Drive
                    google_success = bool(file.google_drive_file_id)
                    if google_avail:
                        try:
                            folder_id = ensure_folder_cloud_id(file.folder_id, "google", file.family, db)
                            res = self.providers["google"].upload_file(
                                config=config.get("google", {}),
                                vault_folder_id=folder_id,
                                filename=file.filename,
                                file_content=local_content,
                                mimetype=mimetype,
                                db=db
                            )
                            file.google_drive_file_id = res["cloud_file_id"]
                            file.cloud_link = res.get("cloud_link")
                            google_success = True
                            logger.info(f"Dual Mirror: Synced file {file.filename} to Google Drive")
                        except Exception as e:
                            logger.error(f"Dual Mirror: Failed to sync {file.filename} to Google Drive: {e}")
                            
                    # Sync to MEGA
                    mega_success = bool(file.mega_file_id)
                    if mega_avail:
                        try:
                            folder_id = ensure_folder_cloud_id(file.folder_id, "mega", file.family, db)
                            res = self.providers["mega"].upload_file(
                                config=config.get("mega", {}),
                                vault_folder_id=folder_id,
                                filename=file.filename,
                                file_content=local_content,
                                mimetype=mimetype,
                                db=db
                            )
                            file.mega_file_id = res["cloud_file_id"]
                            if not file.cloud_link:
                                file.cloud_link = res.get("cloud_link")
                            mega_success = True
                            logger.info(f"Dual Mirror: Synced file {file.filename} to MEGA")
                        except Exception as e:
                            logger.error(f"Dual Mirror: Failed to sync {file.filename} to MEGA: {e}")
                            
                    # Update file status
                    if google_success:
                        file.storage_provider = "google"
                        file.primary_storage = "google"
                        file.cloud_file_id = file.google_drive_file_id
                    elif mega_success:
                        file.storage_provider = "mega"
                        file.primary_storage = "mega"
                        file.cloud_file_id = file.mega_file_id
                        
                    if google_success and mega_success:
                        file.backup_status = "success"
                        file.pending_sync = False
                        file.pending_sync_at = None
                        file.synced_to = "both"
                        file.lock_acquired_at = None
                        file.lock_holder = None
                        file.sync_retry_count = 0
                        db.commit()
                        
                        # Delete local file
                        try:
                            self.providers["local"].delete_file(local_config, file.local_file_id, db=db)
                            file.local_file_id = None
                            db.commit()
                        except Exception as del_err:
                            logger.warning(f"Local copy delete failed after dual sync: {del_err}")
                        synced += 1
                    else:
                        file.backup_status = "failed" if (not google_success and not mega_success) else "pending"
                        file.lock_acquired_at = None
                        file.lock_holder = None
                        file.sync_retry_count += 1
                        db.commit()
                        failed += 1
                        
                else:
                    # Option 2: Failover (Primary and Backup)
                    availability = self.check_availability(config, db=db)
                    primary_avail = availability.get(primary_provider)
                    backup_avail = availability.get(backup_provider)
                    
                    if not primary_avail and not backup_avail:
                        skipped += 1
                        db.query(File).filter(File.id == file.id).update({
                            "lock_acquired_at": None,
                            "lock_holder": None
                        }, synchronize_session=False)
                        db.commit()
                        continue

                    # Succeeded to find at least one provider to sync
                    try:
                        local_config = config.get("local", {})
                        local_content = self.providers["local"].download_file(
                            local_config, file.local_file_id, db=db
                        )
                    except Exception as e:
                        logger.error(f"Failed to download local file for sync: {e}")
                        db.query(File).filter(File.id == file.id).update({
                            "lock_acquired_at": None,
                            "lock_holder": None,
                            "sync_retry_count": File.sync_retry_count + 1
                        }, synchronize_session=False)
                        db.commit()
                        failed += 1
                        continue

                    primary_success = False
                    backup_success = False
                    
                    # Try Primary
                    if primary_avail:
                        try:
                            folder_id = ensure_folder_cloud_id(file.folder_id, primary_provider, file.family, db)
                            res = self.providers[primary_provider].upload_file(
                                config=config.get(primary_provider, {}),
                                vault_folder_id=folder_id,
                                filename=file.filename,
                                file_content=local_content,
                                mimetype=mimetype,
                                db=db
                            )
                            p_file_id = res["cloud_file_id"]
                            if primary_provider == "google":
                                file.google_drive_file_id = p_file_id
                            else:
                                file.mega_file_id = p_file_id
                                
                            file.storage_provider = primary_provider
                            file.primary_storage = primary_provider
                            file.cloud_file_id = p_file_id
                            file.cloud_link = res.get("cloud_link")
                            file.backup_status = "none"
                            file.pending_sync = False
                            file.pending_sync_at = None
                            file.synced_to = primary_provider
                            file.lock_acquired_at = None
                            file.lock_holder = None
                            file.sync_retry_count = 0
                            db.commit()
                            
                            # Delete local file
                            try:
                                self.providers["local"].delete_file(local_config, file.local_file_id, db=db)
                                file.local_file_id = None
                                db.commit()
                            except Exception as del_err:
                                logger.warning(f"Local copy delete failed after sync: {del_err}")
                            primary_success = True
                            synced += 1
                            logger.info(f"Dual Failover: Synced to Primary ({primary_provider}) successfully")
                        except Exception as e:
                            logger.error(f"Dual Failover: Primary ({primary_provider}) upload failed: {e}")
                            
                    # Try Backup if Primary failed
                    if not primary_success and backup_avail:
                        try:
                            folder_id = ensure_folder_cloud_id(file.folder_id, backup_provider, file.family, db)
                            res = self.providers[backup_provider].upload_file(
                                config=config.get(backup_provider, {}),
                                vault_folder_id=folder_id,
                                filename=file.filename,
                                file_content=local_content,
                                mimetype=mimetype,
                                db=db
                            )
                            b_file_id = res["cloud_file_id"]
                            if backup_provider == "google":
                                file.google_drive_file_id = b_file_id
                            else:
                                file.mega_file_id = b_file_id
                                
                            file.storage_provider = backup_provider
                            file.primary_storage = primary_provider
                            file.cloud_file_id = b_file_id
                            file.cloud_link = res.get("cloud_link")
                            file.backup_status = "success"
                            file.pending_sync = False
                            file.pending_sync_at = None
                            file.synced_to = backup_provider
                            file.lock_acquired_at = None
                            file.lock_holder = None
                            file.sync_retry_count = 0
                            db.commit()
                            
                            # Delete local file
                            try:
                                self.providers["local"].delete_file(local_config, file.local_file_id, db=db)
                                file.local_file_id = None
                                db.commit()
                            except Exception as del_err:
                                logger.warning(f"Local copy delete failed after sync: {del_err}")
                            backup_success = True
                            synced += 1
                            logger.info(f"Dual Failover: Synced to Backup ({backup_provider}) successfully")
                        except Exception as e:
                            logger.error(f"Dual Failover: Backup ({backup_provider}) upload also failed: {e}")
                                
                    if not primary_success and not backup_success:
                        db.query(File).filter(File.id == file.id).update({
                            "lock_acquired_at": None,
                            "lock_holder": None,
                            "sync_retry_count": File.sync_retry_count + 1
                        }, synchronize_session=False)
                        db.commit()
                        failed += 1
            else:
                # Single provider sync
                availability = self.check_availability(config, db=db)
                
                # Determine target provider based on active config or fallback
                target = None
                if provider in ("google", "mega"):
                    target = provider
                    # Check fallback compatibility for legacy test cases/downtime
                    if provider == "google" and not availability.get("google") and availability.get("mega"):
                        target = "mega"
                    elif provider == "mega" and not availability.get("mega") and availability.get("google"):
                        target = "google"
                else:
                    # Fallback for legacy test cases where provider might be "local" or not set,
                    # but file has pending_sync = True
                    if availability.get("google"):
                        target = "google"
                    elif availability.get("mega"):
                        target = "mega"

                if not target or not availability.get(target):
                    skipped += 1
                    logger.warning({
                        "message":   "Cloud provider unavailable, releasing lease",
                        "file_id":   file.file_id,
                        "family_id": file.family_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
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
                except Exception as e:
                    logger.error(f"Failed to download local file for sync: {e}")
                    db.query(File).filter(File.id == file.id).update({
                        "lock_acquired_at": None,
                        "lock_holder": None,
                        "sync_retry_count": File.sync_retry_count + 1
                    }, synchronize_session=False)
                    db.commit()
                    failed += 1
                    continue

                try:
                    target_config = config.get(target, {})
                    if file.folder_id is not None:
                        target_vault_id = ensure_folder_cloud_id(file.folder_id, target, file.family, db)
                        target_username = None
                    else:
                        target_vault_id = config.get(target, {}).get("vault_folder_id") or file.family.vault_folder_id
                        target_username = None

                    cloud_result = self.providers[target].upload_file(
                        config=target_config,
                        vault_folder_id=target_vault_id,
                        filename=file.filename,
                        file_content=local_content,
                        mimetype=mimetype,
                        username=target_username,
                        db=db
                    )

                    old_local_file_id = file.local_file_id
                    
                    if target == "google":
                        file.google_drive_file_id = cloud_result["cloud_file_id"]
                        file.primary_storage = "google"
                    elif target == "mega":
                        file.mega_file_id = cloud_result["cloud_file_id"]
                        file.primary_storage = "mega"
                        
                    file.cloud_file_id = cloud_result["cloud_file_id"]
                    file.cloud_link = cloud_result.get("cloud_link")
                    file.storage_provider = target
                    file.pending_sync = False
                    file.pending_sync_at = None
                    file.synced_to = target
                    file.lock_acquired_at = None
                    file.lock_holder = None
                    file.sync_retry_count = 0
                    db.commit()

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
        config_data = family.storage_config or {}
        
        if family.storage_provider == "dual":
            # Initialize Google Drive if not already done
            google_vault_id = config_data.get("google", {}).get("vault_folder_id") or config_data.get("google_vault_folder_id")
            if not google_vault_id:
                google_config = config_data.get("google", {})
                if not google_config and GOOGLE_FOLDER_ID:
                    google_config = {"folder_id": GOOGLE_FOLDER_ID}
                sa_file = GOOGLE_SERVICE_ACCOUNT_FILE or "service-account.json"
                if not os.path.isabs(sa_file):
                    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    sa_file = os.path.join(backend_dir, sa_file)
                if (google_config.get("client_id") and google_config.get("refresh_token")) or (os.path.exists(sa_file)):
                    try:
                        google_vault_id = self.providers["google"].ensure_vault_folder(family.id, google_config, db=db)
                        if "google" not in config_data:
                            config_data["google"] = {}
                        config_data["google"]["vault_folder_id"] = google_vault_id
                        config_data["google_vault_folder_id"] = google_vault_id
                        family.storage_config = config_data
                        db.commit()
                    except Exception as err:
                        logger.warning(f"Failed to init Google Drive under dual mode: {err}")
            
            # Initialize MEGA if not already done
            mega_vault_id = config_data.get("mega", {}).get("vault_folder_id") or config_data.get("mega_vault_folder_id")
            if not mega_vault_id:
                mega_config = config_data.get("mega", {})
                if not mega_config and MEGA_EMAIL and MEGA_PASSWORD:
                    mega_config = {"email": MEGA_EMAIL, "password": MEGA_PASSWORD}
                if mega_config.get("email") and mega_config.get("password"):
                    try:
                        mega_vault_id = self.providers["mega"].ensure_vault_folder(family.id, mega_config)
                        if "mega" not in config_data:
                            config_data["mega"] = {}
                        config_data["mega"]["vault_folder_id"] = mega_vault_id
                        config_data["mega_vault_folder_id"] = mega_vault_id
                        family.storage_config = config_data
                        db.commit()
                    except Exception as err:
                        logger.warning(f"Failed to init MEGA under dual mode: {err}")
                        
            # Set family.vault_folder_id to primary provider's vault id
            primary = config_data.get("primary_provider", "google")
            if primary == "google" and google_vault_id:
                family.vault_folder_id = google_vault_id
            elif primary == "mega" and mega_vault_id:
                family.vault_folder_id = mega_vault_id
            db.commit()
            return

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
        
        # Parse storage_config
        config_data = family.storage_config or {}
        
        # Determine if legacy flat config
        google_data = {}
        mega_data = {}
        
        if "google" in config_data:
            google_data = config_data.get("google") or {}
        elif "client_id" in config_data or "refresh_token" in config_data:
            google_data = config_data.copy()
            
        if "mega" in config_data:
            mega_data = config_data.get("mega") or {}
        elif "email" in config_data:
            mega_data = config_data.copy()
            
        # Ensure vault_folder_id is propagated if stored in the family model
        if family.storage_provider == "google" and family.vault_folder_id:
            google_data["vault_folder_id"] = family.vault_folder_id
        if family.storage_provider == "mega" and family.vault_folder_id:
            mega_data["vault_folder_id"] = family.vault_folder_id
            
        # Build mega config
        mega_cfg = mega_data.copy()
        if MEGA_EMAIL and "email" not in mega_cfg:
            mega_cfg["email"] = MEGA_EMAIL
        if MEGA_PASSWORD and "password" not in mega_cfg:
            mega_cfg["password"] = MEGA_PASSWORD
        if "vault_folder_id" not in mega_cfg and "mega_vault_folder_id" in config_data:
            mega_cfg["vault_folder_id"] = config_data["mega_vault_folder_id"]
            
        # Build google config
        google_cfg = google_data.copy()
        if GOOGLE_FOLDER_ID and "folder_id" not in google_cfg:
            google_cfg["folder_id"] = GOOGLE_FOLDER_ID
        if "vault_folder_id" not in google_cfg and "google_vault_folder_id" in config_data:
            google_cfg["vault_folder_id"] = config_data["google_vault_folder_id"]
 
        return {
            "local": local_cfg,
            "mega": mega_cfg,
            "google": google_cfg,
            "storage_provider": family.storage_provider,
            "storage_mode": config_data.get("storage_mode", "failover"),
            "primary_provider": config_data.get("primary_provider", "google"),
        }
 
    def get_file_config(self, file, db: Session) -> dict:
        family_cfg = self.get_family_config(file.family, db)
        provider = file.storage_provider or "local"
        return family_cfg.get(provider, {})
