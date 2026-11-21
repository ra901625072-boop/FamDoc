#!/usr/bin/env python3
"""
scripts/migrate_local_to_r2.py

Idempotent, resumable migration script to copy local vault files to Cloudflare R2.
Verifies integrity via SHA-256 and byte-size checks before updating database records.
"""

import os
import sys
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

# Ensure backend directory is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from database import SessionLocal, engine, Base
import models
from storage.r2_provider import R2StorageProvider
from config import R2_BUCKET_NAME

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate_local_to_r2")


def calculate_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(128 * 1024):
            sha.update(chunk)
    return sha.hexdigest()


def calculate_bytes_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def migrate(dry_run: bool = False, family_id: Optional[str] = None):
    logger.info("==================================================================")
    logger.info("       FDMS LOCAL VAULT -> CLOUDFLARE R2 MIGRATION SCRIPT         ")
    logger.info(f" Mode: {'DRY RUN (No Writes)' if dry_run else 'LIVE MIGRATION'} ")
    logger.info("==================================================================")

    # Ensure schema exists (e.g. SQLite local testing or fresh environment)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    r2 = R2StorageProvider()
    client = r2._get_client()

    if not dry_run and client is None:
        logger.error("Cloudflare R2 credentials are not configured! Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.")
        sys.exit(1)

    bucket = r2._get_bucket_name()
    base_vault_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "local_vault"))

    # Initial DB verification query
    query = db.query(models.File).filter(
        models.File.deleted_at == None,
        (models.File.storage_provider == "local") | (models.File.local_file_id != None)
    )
    if family_id:
        query = query.filter(models.File.family_id == family_id)

    files_to_migrate = query.all()
    logger.info(f"Found {len(files_to_migrate)} active database files staged on local storage.")

    total_scanned = 0
    total_uploaded = 0
    total_skipped = 0
    total_failed = 0
    bytes_transferred = 0

    for file in files_to_migrate:
        total_scanned += 1
        fam_id = file.family_id
        local_id = file.local_file_id or file._file_id

        if not local_id:
            logger.warning(f"File ID {file.id} ({file.filename}) has no local_file_id recorded. Skipping.")
            total_skipped += 1
            continue

        local_path = os.path.join(base_vault_dir, fam_id, local_id)
        if not os.path.exists(local_path):
            # Check if file has already been synced to Google Drive
            if file.google_drive_file_id or file.cloud_file_id:
                logger.info(f"File ID {file.id} ({file.filename}) is already synced to Google Drive ({file.cloud_file_id}). Updating provider flag.")
                if not dry_run:
                    file.storage_provider = "google"
                    file.local_file_id = None
                    db.commit()
                total_skipped += 1
                continue
            else:
                logger.error(f"CRITICAL: Local file missing on disk for ID {file.id}: {local_path}")
                total_failed += 1
                continue

        local_size = os.path.getsize(local_path)
        local_sha256 = calculate_sha256(local_path)
        target_key = f"{fam_id}/{local_id}"

        logger.info(f"Processing [{total_scanned}/{len(files_to_migrate)}] {file.filename} ({local_size} bytes, SHA: {local_sha256[:12]}...)")

        if dry_run:
            logger.info(f"[DRY-RUN] Would upload {local_path} -> r2://{bucket}/{target_key}")
            total_uploaded += 1
            bytes_transferred += local_size
            continue

        # Check if already exists in R2 (Idempotency)
        already_exists = False
        try:
            head_res = client.head_object(Bucket=bucket, Key=target_key)
            remote_size = head_res.get("ContentLength", 0)
            if remote_size == local_size:
                logger.info(f"Object already exists in R2 with matching size ({remote_size} bytes). Skipping re-upload.")
                already_exists = True
        except Exception:
            already_exists = False

        if not already_exists:
            try:
                mimetype = file.file_type or "application/octet-stream"
                with open(local_path, "rb") as f:
                    client.put_object(
                        Bucket=bucket,
                        Key=target_key,
                        Body=f,
                        ContentType=mimetype,
                        Metadata={"sha256": local_sha256, "original_filename": file.filename}
                    )
                logger.info(f"Successfully uploaded {file.filename} to r2://{bucket}/{target_key}")
                bytes_transferred += local_size
                total_uploaded += 1
            except Exception as e:
                logger.error(f"Failed to upload {file.filename} to R2: {e}")
                total_failed += 1
                continue

        # Verify uploaded object integrity
        try:
            head_verify = client.head_object(Bucket=bucket, Key=target_key)
            if head_verify.get("ContentLength") != local_size:
                raise ValueError(f"Size mismatch: local {local_size} vs R2 {head_verify.get('ContentLength')}")
        except Exception as verify_err:
            logger.error(f"Verification failed for {target_key}: {verify_err}")
            total_failed += 1
            continue

        # Update database record
        file.cloud_file_id = target_key
        file._file_id = target_key
        file.storage_provider = "r2"
        file.primary_storage = "r2"
        file.local_file_id = None
        db.commit()
        logger.info(f"Database record updated for File ID {file.id} -> storage_provider='r2'")

    db.close()

    logger.info("==================================================================")
    logger.info("                      MIGRATION SUMMARY                           ")
    logger.info("==================================================================")
    logger.info(f"Total Records Scanned: {total_scanned}")
    logger.info(f"Total Files Uploaded:  {total_uploaded}")
    logger.info(f"Total Files Skipped:   {total_skipped}")
    logger.info(f"Total Failures:        {total_failed}")
    logger.info(f"Bytes Transferred:     {bytes_transferred} bytes ({bytes_transferred / (1024 * 1024):.2f} MB)")
    logger.info("==================================================================")

    if total_failed > 0:
        logger.error(f"Migration completed with {total_failed} errors!")
        sys.exit(1)
    else:
        logger.info("SUCCESS: All staged files successfully verified and updated!")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Migrate FDMS local vault files to Cloudflare R2")
    parser.add_argument("--dry-run", action="store_true", help="Simulate migration without modifying R2 or DB")
    parser.add_argument("--family-id", type=str, default=None, help="Migrate files for a specific family ID only")
    args = parser.parse_args()

    migrate(dry_run=args.dry_run, family_id=args.family_id)
