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
from config import GOOGLE_SERVICE_ACCOUNT_FILE, GOOGLE_FOLDER_ID

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Availability cache (module-level, shared across all StorageManager instances)
# ---------------------------------------------------------------------------
_availability_cache: dict = {}
_cache_lock = threading.Lock()


class StorageManager:
    def __init__(self):
        from storage.google_drive_provider import GoogleDriveProvider
        from storage.local import LocalStorageProvider

        self.providers = {
            "google": GoogleDriveProvider(),
            "local":  LocalStorageProvider(),
        }

    def check_availability(self, config: dict, cache_ttl: int = 30, db = None) -> dict:
        """
        Returns { "google": bool }.
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

    def get_family_storage_accounts(self, family, db: Session) -> list[dict]:
        from models import StorageAccount
        accounts = db.query(StorageAccount).filter(
            StorageAccount.family_id == family.id,
            StorageAccount.status == "active",
        ).order_by(StorageAccount.priority.asc()).all()

        result = []
        for acct in accounts:
            cfg = (acct.config or {}).copy()
            # Only include accounts that have valid credentials
            if not cfg.get("client_id") or not (cfg.get("refresh_token") or cfg.get("access_token")):
                continue
            cfg["vault_folder_id"] = acct.vault_folder_id
            cfg["family_id"] = family.id
            cfg["storage_account_id"] = acct.id
            cfg["email"] = acct.email
            result.append(cfg)
        return result

    def select_target_account(self, family, file_size: int, db: Session):
        from models import StorageAccount
        accounts = db.query(StorageAccount).filter(
            StorageAccount.family_id == family.id,
            StorageAccount.status == "active",
        ).all()

        # Only select from accounts with valid, decryptable credentials
        valid_accounts = [
            a for a in accounts
            if a.config and a.config.get("client_id") and (a.config.get("refresh_token") or a.config.get("access_token"))
        ]
        accounts = valid_accounts

        if not accounts and family:
            # Fallback for legacy setups or unit test fixtures: auto-create default active account
            cfg = family.storage_config or {}
            g_cfg = cfg.get("google", cfg) if isinstance(cfg, dict) else {}
            if g_cfg.get("client_id") and (g_cfg.get("refresh_token") or g_cfg.get("access_token")):
                acct = StorageAccount(
                    family_id=family.id,
                    provider="google",
                    email=f"{family.name} (Google)",
                    vault_folder_id=family.vault_folder_id,
                    status="active",
                    priority=0
                )
                acct.config = g_cfg if isinstance(g_cfg, dict) else {}
                db.add(acct)
                db.commit()
                accounts = [acct]

        candidates = []
        for acct in accounts:
            free = self._get_or_refresh_free_space(acct, db)
            if free is None:
                # Unlimited Workspace account or unknown quota limit / mock provider
                candidates.append((float('inf'), acct))
            elif free >= file_size:
                candidates.append((free, acct))

        if not candidates:
            return None
        # Most free space wins — tie-breaker is lower priority number
        candidates.sort(key=lambda pair: (-pair[0], pair[1].priority))
        return candidates[0][1]

    def _get_or_refresh_free_space(self, acct, db: Session) -> Optional[int]:
        now = datetime.now(timezone.utc)
        QUOTA_CACHE_TTL_SECONDS = 300
        if acct.quota_checked_at and (now - acct.quota_checked_at).total_seconds() < QUOTA_CACHE_TTL_SECONDS:
            if acct.cached_quota_total is None:
                return None
            return acct.cached_quota_total - (acct.cached_quota_used or 0)
        try:
            cfg = acct.config
            if not cfg or not cfg.get("client_id") or not (cfg.get("refresh_token") or cfg.get("access_token")):
                return None
            if hasattr(self.providers["google"], "get_quota"):
                total, used = self.providers["google"].get_quota(cfg, db=db)
                acct.cached_quota_total = total
                acct.cached_quota_used = used
                acct.quota_checked_at = now
                db.commit()
                return (total - used) if total is not None else None
            return None
        except Exception as e:
            logger.warning(f"Failed to refresh free space for storage account {acct.id}: {e}")
            return None

    def _resolve_account_config(self, file, db: Session) -> Optional[dict]:
        if file.storage_provider == "google":
            # 1. Try file's designated storage account if valid
            if file.storage_account_id:
                from models import StorageAccount
                acct = db.query(StorageAccount).get(file.storage_account_id)
                if acct and acct.status == "active":
                    cfg = (acct.config or {}).copy()
                    if cfg.get("client_id") and (cfg.get("refresh_token") or cfg.get("access_token")):
                        cfg["vault_folder_id"] = acct.vault_folder_id
                        cfg["family_id"] = file.family_id
                        cfg["storage_account_id"] = acct.id
                        return cfg

            # 2. Fallback: Search for any active, valid Google storage account in the same family
            fam_id = file.family_id or (file.family.id if getattr(file, "family", None) else None)
            if fam_id and db:
                from models import StorageAccount
                active_accts = db.query(StorageAccount).filter(
                    StorageAccount.family_id == fam_id,
                    StorageAccount.status == "active",
                    StorageAccount.provider == "google"
                ).order_by(StorageAccount.priority.asc(), StorageAccount.id.asc()).all()
                for active_acct in active_accts:
                    cfg = (active_acct.config or {}).copy()
                    if cfg.get("client_id") and (cfg.get("refresh_token") or cfg.get("access_token")):
                        cfg["vault_folder_id"] = active_acct.vault_folder_id
                        cfg["family_id"] = fam_id
                        cfg["storage_account_id"] = active_acct.id
                        return cfg

            # 3. Fallback to legacy single account config on Family record
            family = getattr(file, "family", None)
            if not family and fam_id and db:
                from models import Family
                family = db.query(Family).get(fam_id)
            if family:
                family_config = self.get_family_config(family, db)
                g_cfg = family_config.get("google", {})
                if g_cfg.get("client_id") and (g_cfg.get("refresh_token") or g_cfg.get("access_token")):
                    return g_cfg

        return {}

    def read_file(self, file, family_config: dict, db = None) -> bytes:
        provider_name = file.storage_provider or "local"
        cascade_order = self._cascade_from(provider_name)

        for p_name in cascade_order:
            try:
                cfg = {}
                if p_name == "local":
                    cfg = family_config.get("local", {})
                    f_id = file.local_file_id or (file._file_id if file.storage_provider == "local" or not file.storage_provider else None)
                elif p_name == "google":
                    cfg = self._resolve_account_config(file, db) if db else family_config.get("google", {})
                    f_id = file.google_drive_file_id or (file.cloud_file_id if file.storage_provider == "google" else None) or (file._file_id if file.storage_provider == "google" else None)

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

    def stream_file(self, file, family_config: dict, db = None):
        provider_name = file.storage_provider or "local"
        cascade_order = self._cascade_from(provider_name)

        for p_name in cascade_order:
            try:
                cfg = {}
                if p_name == "local":
                    cfg = family_config.get("local", {})
                    f_id = file.local_file_id or (file._file_id if file.storage_provider == "local" or not file.storage_provider else None)
                elif p_name == "google":
                    cfg = self._resolve_account_config(file, db) if db else family_config.get("google", {})
                    f_id = file.google_drive_file_id or (file.cloud_file_id if file.storage_provider == "google" else None) or (file._file_id if file.storage_provider == "google" else None)

                if not f_id:
                    continue
                
                # Check if provider has stream_file
                if hasattr(self.providers[p_name], "stream_file"):
                    stream = self.providers[p_name].stream_file(cfg, f_id, db=db)
                    if stream is not None:
                        return stream, p_name
                        
                # Fallback to download_file if stream_file is not supported or returns None
                content = self.providers[p_name].download_file(cfg, f_id, db=db)
                
                def fallback_generator():
                    yield content
                return fallback_generator(), p_name
                
            except Exception as e:
                logger.warning({
                    "message":   "File not found or unreachable on provider for streaming, trying next",
                    "error":     str(e),
                    "service":   p_name,
                    "file_id":   file.file_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

        raise FileNotFoundError(
            f"File '{file.filename}' is temporarily unavailable. "
            "It may still be syncing to cloud storage. Please try again shortly."
        )

    def get_thumbnail_url(self, file, family_config: dict, db = None) -> Optional[str]:
        provider_name = file.storage_provider or "local"
        if provider_name == "google":
            cfg = self._resolve_account_config(file, db) if db else family_config.get("google", {})
            f_id = file.google_drive_file_id or (file.cloud_file_id if file.storage_provider == "google" else None) or (file._file_id if file.storage_provider == "google" else None)
            if f_id:
                try:
                    if hasattr(self.providers["google"], "get_thumbnail_url"):
                        return self.providers["google"].get_thumbnail_url(cfg, f_id, db=db)
                except Exception as e:
                    logger.warning(f"Failed to get thumbnail url: {e}")
        return None

    def stream_thumbnail(self, file, family_config: dict, db = None):
        provider_name = file.storage_provider or "local"
        if provider_name == "google":
            cfg = self._resolve_account_config(file, db) if db else family_config.get("google", {})
            f_id = file.google_drive_file_id or (file.cloud_file_id if file.storage_provider == "google" else None) or (file._file_id if file.storage_provider == "google" else None)
            if f_id:
                try:
                    if hasattr(self.providers["google"], "stream_thumbnail"):
                        return self.providers["google"].stream_thumbnail(cfg, f_id, db=db)
                except Exception as e:
                    logger.warning(f"Failed to stream thumbnail: {e}")
        return None

    def get_direct_download_url(self, file, family_config: dict, db = None) -> Optional[str]:
        provider_name = file.storage_provider or "local"
        if provider_name == "google":
            cfg = self._resolve_account_config(file, db) if db else family_config.get("google", {})
            f_id = file.google_drive_file_id or (file.cloud_file_id if file.storage_provider == "google" else None) or (file._file_id if file.storage_provider == "google" else None)
            if f_id:
                try:
                    if hasattr(self.providers["google"], "get_direct_download_url"):
                        return self.providers["google"].get_direct_download_url(cfg, f_id, db=db)
                except Exception as e:
                    logger.warning(f"Failed to get direct download url: {e}")
        return None

    def _cascade_from(self, provider: str) -> list:
        full_order = ["google", "local"]
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
        from sqlalchemy import or_
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
            mimetype = file.file_type or "application/octet-stream"

            # Check availability first (handles mock availability checks in tests)
            availability = self.check_availability(config, db=db)
            if not availability.get("google"):
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

            # Determine target storage account
            target_account = self.select_target_account(file.family, file.size_bytes, db)

            if not target_account:
                skipped += 1
                logger.warning({
                    "message":   "No active cloud storage account with sufficient quota available, releasing lease",
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
                target_config = (target_account.config or {}).copy()
                target_config["vault_folder_id"] = target_account.vault_folder_id
                target_config["family_id"] = file.family_id
                target_config["storage_account_id"] = target_account.id

                if file.folder_id is not None:
                    target_vault_id = ensure_folder_cloud_id(file.folder_id, "google", file.family, db)
                    target_username = None
                else:
                    target_vault_id = target_account.vault_folder_id or file.family.vault_folder_id
                    target_username = None

                cloud_result = self.providers["google"].upload_file(
                    config=target_config,
                    vault_folder_id=target_vault_id,
                    filename=file.filename,
                    file_content=local_content,
                    mimetype=mimetype,
                    username=target_username,
                    db=db
                )

                old_local_file_id = file.local_file_id
                
                file.google_drive_file_id = cloud_result["cloud_file_id"]
                file.primary_storage = "google"
                file.storage_account_id = target_account.id
                    
                file.cloud_file_id = cloud_result["cloud_file_id"]
                file.cloud_link = cloud_result.get("cloud_link")
                file.storage_provider = "google"
                file.pending_sync = False
                file.pending_sync_at = None
                file.synced_to = "google"
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
                    "service":   "google",
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

    def migrate_account_files(self, account_id: int, db: Session):
        """
        Migrates files stored on a disconnecting StorageAccount to another active account.
        """
        from models import File, StorageAccount
        acct = db.query(StorageAccount).get(account_id)
        if not acct:
            return

        files = db.query(File).filter(
            File.storage_account_id == account_id,
            File.deleted_at == None
        ).all()

        logger.info(f"Account Disconnect Migration: Starting migration of {len(files)} files for account {account_id}")

        for file in files:
            try:
                # 1. Download file content from current account
                content = self.read_file(file, {}, db=db)
                old_cloud_file_id = file.google_drive_file_id or file.cloud_file_id

                # 2. Select target replacement account
                target_acct = self.select_target_account(file.family, file.size_bytes, db)
                if target_acct and target_acct.id != account_id:
                    target_config = (target_acct.config or {}).copy()
                    target_config["vault_folder_id"] = target_acct.vault_folder_id
                    target_config["family_id"] = file.family_id
                    target_config["storage_account_id"] = target_acct.id

                    cloud_result = self.providers["google"].upload_file(
                        config=target_config,
                        vault_folder_id=target_acct.vault_folder_id,
                        filename=file.filename,
                        file_content=content,
                        mimetype=file.file_type or "application/octet-stream",
                        db=db
                    )
                    file.storage_account_id = target_acct.id
                    file.google_drive_file_id = cloud_result["cloud_file_id"]
                    file.cloud_file_id = cloud_result["cloud_file_id"]
                    file.cloud_link = cloud_result.get("cloud_link")
                else:
                    # Fallback: promote back to local storage
                    local_config = self.get_family_config(file.family, db).get("local", {})
                    local_res = self.providers["local"].upload_file(
                        config=local_config,
                        vault_folder_id=local_config.get("vault_folder_id"),
                        filename=file.filename,
                        file_content=content,
                        mimetype=file.file_type or "application/octet-stream"
                    )
                    file.storage_provider = "local"
                    file.storage_account_id = None
                    file.local_file_id = local_res["cloud_file_id"]
                    file.google_drive_file_id = None
                    file.cloud_file_id = None
                    file.pending_sync = True

                db.commit()

                # Delete from old account if possible
                try:
                    old_cfg = (acct.config or {}).copy()
                    if old_cloud_file_id:
                        self.providers["google"].delete_file(old_cfg, old_cloud_file_id, db=db)
                except Exception as del_err:
                    logger.warning(f"Failed to delete file {old_cloud_file_id} from disconnecting account {account_id}: {del_err}")

            except Exception as file_err:
                logger.error(f"Failed to migrate file {file.id} from disconnecting account {account_id}: {file_err}")

        # Check if 0 files remain
        remaining = db.query(File).filter(File.storage_account_id == account_id).count()
        if remaining == 0:
            acct.status = "disconnected"
            acct.disconnected_at = datetime.now(timezone.utc)
            db.commit()
            logger.info(f"Account Disconnect Migration: Successfully disconnected account {account_id}")

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
        # If the storage provider is already initialized with a vault, bypass initialization
        # to avoid redundant, blocking network calls on every API request.
        if family.storage_provider and family.vault_folder_id:
            return

        config_data = family.storage_config or {}

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
 
        # 2. Fallback to Local Storage
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
        
        if "google" in config_data:
            google_data = config_data.get("google") or {}
        elif "client_id" in config_data or "refresh_token" in config_data:
            google_data = config_data.copy()
            
        # Ensure vault_folder_id is propagated if stored in the family model
        if family.storage_provider == "google" and family.vault_folder_id:
            google_data["vault_folder_id"] = family.vault_folder_id
            
        # Build google config
        google_cfg = google_data.copy()
        if GOOGLE_FOLDER_ID and "folder_id" not in google_cfg:
            google_cfg["folder_id"] = GOOGLE_FOLDER_ID
        if "vault_folder_id" not in google_cfg and "google_vault_folder_id" in config_data:
            google_cfg["vault_folder_id"] = config_data["google_vault_folder_id"]
 
        return {
            "local": local_cfg,
            "google": google_cfg,
            "storage_provider": family.storage_provider,
        }
 
    def get_file_config(self, file, db: Session) -> dict:
        family_cfg = self.get_family_config(file.family, db)
        provider = file.storage_provider or "local"
        return family_cfg.get(provider, {})
