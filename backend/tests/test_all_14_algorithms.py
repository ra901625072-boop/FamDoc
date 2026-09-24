import os
import sys
import time
import io
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

# Adjust python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import Base
import models
import auth
from storage.storage_manager import StorageManager
from storage.google_drive_provider import GoogleDriveProvider
from utils.rate_limiter import InMemoryRateLimiter
from utils.crypto import encrypt_config, decrypt_config
from cache import TTLCache
from routers.files import validate_file_content_signature
from tests.test_redesign import engine, TestingSessionLocal

class TestAll14Algorithms(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        try:
            if os.path.exists("./test_redesign_temp.db"):
                os.remove("./test_redesign_temp.db")
        except OSError:
            pass

    def setUp(self):
        self.db = TestingSessionLocal()
        self.db.query(models.AuditLog).delete()
        self.db.query(models.File).delete()
        self.db.query(models.Folder).delete()
        self.db.query(models.StorageAccount).delete()
        self.db.query(models.FamilyMember).delete()
        self.db.query(models.Family).delete()
        self.db.query(models.User).delete()
        self.db.commit()

        # Admin user & family
        self.admin = models.User(
            username="algo_admin",
            email="admin@algo.com",
            password_hash=auth.get_password_hash("AdminPass123"),
            role="admin"
        )
        self.db.add(self.admin)
        self.db.flush()

        self.family = models.Family(
            id="fam_algo_test",
            name="Algorithm Family",
            admin_id=self.admin.id,
            secret_code_hash="hashed_secret",
            max_members=10,
            storage_quota_bytes=20 * 1024 * 1024 * 1024,
            storage_provider="google",
            vault_folder_id="vault-algo-root"
        )
        self.db.add(self.family)
        self.db.flush()

        self.member = models.FamilyMember(
            family_id=self.family.id,
            user_id=self.admin.id,
            role="admin"
        )
        self.db.add(self.member)
        self.db.commit()

        self.token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": "admin"})
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.manager = StorageManager()

    def tearDown(self):
        self.db.close()

    # =========================================================================
    # ALGORITHM 1: Greedy Most-Free-Space Allocation with Priority Tie-Breaker
    # =========================================================================
    def test_algo_01_greedy_most_free_space_allocation(self):
        """
        Algorithm 1: Selects the drive with highest available free space;
        uses lower priority number as a tie-breaker when free space is identical.
        """
        acct1 = models.StorageAccount(
            family_id=self.family.id, provider="google", email="d1@a.com", label="D1",
            status="active", priority=0, cached_quota_total=5000, cached_quota_used=3000, # 2000 free
            quota_checked_at=datetime.now(timezone.utc), vault_folder_id="v1"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id, provider="google", email="d2@a.com", label="D2",
            status="active", priority=1, cached_quota_total=5000, cached_quota_used=1500, # 3500 free (MOST)
            quota_checked_at=datetime.now(timezone.utc), vault_folder_id="v2"
        )
        acct3 = models.StorageAccount(
            family_id=self.family.id, provider="google", email="d3@a.com", label="D3",
            status="active", priority=2, cached_quota_total=5000, cached_quota_used=4000, # 1000 free
            quota_checked_at=datetime.now(timezone.utc), vault_folder_id="v3"
        )
        self.db.add_all([acct1, acct2, acct3])
        self.db.commit()

        # Upload 500 bytes -> Drive 2 must be picked (3500 free)
        picked = self.manager.select_target_account(self.family, 500, self.db)
        self.assertEqual(picked.id, acct2.id, "Algorithm 1 must choose Drive 2 with most free space")

        # Equalize free space between Drive 1 and Drive 2 at 2000 free
        acct2.cached_quota_used = 3000 # 2000 free
        self.db.commit()

        # Tie-breaker: Drive 1 priority 0 vs Drive 2 priority 1 -> Drive 1 must win
        picked_tie = self.manager.select_target_account(self.family, 500, self.db)
        self.assertEqual(picked_tie.id, acct1.id, "Algorithm 1 tie-breaker must pick lower priority integer")

    # =========================================================================
    # ALGORITHM 2: Partitioned Capacity Validation (Single File vs Multi-Drive)
    # =========================================================================
    def test_algo_02_partitioned_capacity_validation(self):
        """
        Algorithm 2: Rejects file upfront when no single drive can fit it,
        even if total aggregate pool space is sufficient.
        """
        acct1 = models.StorageAccount(
            family_id=self.family.id, provider="google", email="d1@a.com", label="D1",
            status="active", priority=0, cached_quota_total=5000, cached_quota_used=4000, # 1000 free
            quota_checked_at=datetime.now(timezone.utc), vault_folder_id="v1"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id, provider="google", email="d2@a.com", label="D2",
            status="active", priority=1, cached_quota_total=5000, cached_quota_used=4000, # 1000 free
            quota_checked_at=datetime.now(timezone.utc), vault_folder_id="v2"
        )
        self.family.storage_quota_bytes = 10000 # Pool free is 2000 bytes
        self.db.add_all([acct1, acct2])
        self.db.commit()

        # Single file is 1500 bytes (> 1000 on Drive 1, > 1000 on Drive 2)
        with patch("utils.virus_scan.scan_file_for_viruses", return_value=True):
            file_payload = {"file": ("oversized.pdf", b"%PDF" + b"x" * 1496, "application/pdf")}
            res = self.client.post("/api/files/upload", files=file_payload, headers=self.headers)
            self.assertEqual(res.status_code, 400)
            self.assertIn("No single Google Drive account has sufficient free space", res.json().get("detail", ""))

    # =========================================================================
    # ALGORITHM 3: Disconnect Drain & Migration Algorithm
    # =========================================================================
    def test_algo_03_account_disconnect_drain_and_migration(self):
        """
        Algorithm 3: Migrates all files (active & recycle bin) from a disconnecting
        drive to replacement drive, updates quotas, and marks old account disconnected.
        """
        old_acct = models.StorageAccount(
            family_id=self.family.id, provider="google", email="old@a.com", label="Old",
            status="disconnecting", priority=0, cached_quota_total=5000, cached_quota_used=1500,
            vault_folder_id="v-old"
        )
        new_acct = models.StorageAccount(
            family_id=self.family.id, provider="google", email="new@a.com", label="New",
            status="active", priority=1, cached_quota_total=10000, cached_quota_used=1000,
            vault_folder_id="v-new"
        )
        self.db.add_all([old_acct, new_acct])
        self.db.commit()

        file1 = models.File(
            filename="active.pdf", file_type="application/pdf", size_bytes=600,
            _file_id="c1", cloud_file_id="c1", google_drive_file_id="c1",
            family_id=self.family.id, uploader_id=self.admin.id, storage_provider="google",
            storage_account_id=old_acct.id
        )
        file2 = models.File(
            filename="deleted.pdf", file_type="application/pdf", size_bytes=900,
            _file_id="c2", cloud_file_id="c2", google_drive_file_id="c2",
            family_id=self.family.id, uploader_id=self.admin.id, storage_provider="google",
            storage_account_id=old_acct.id, deleted_at=datetime.now(timezone.utc)
        )
        self.db.add_all([file1, file2])
        self.db.commit()

        mock_provider = MagicMock()
        mock_provider.download_file.return_value = b"%PDF-migrated"
        mock_provider.upload_file.return_value = {"cloud_file_id": "new_c_id", "cloud_link": "https://drive.google.com/test"}
        mock_provider.find_or_create_folder.return_value = "v-new"
        mock_provider.delete_file.return_value = True
        self.manager.providers["google"] = mock_provider

        # Run migration algorithm
        self.manager.migrate_account_files(old_acct.id, self.db)

        # Both files transferred to new account
        self.db.refresh(file1)
        self.db.refresh(file2)
        self.assertEqual(file1.storage_account_id, new_acct.id)
        self.assertEqual(file2.storage_account_id, new_acct.id)

        # Old account marked disconnected
        self.db.refresh(old_acct)
        self.assertEqual(old_acct.status, "disconnected")
        self.assertEqual(old_acct.cached_quota_used, 0)

        # New account quota incremented by 1500 (1000 -> 2500)
        self.db.refresh(new_acct)
        self.assertEqual(new_acct.cached_quota_used, 2500)

    # =========================================================================
    # ALGORITHM 4: Multi-Account Virtual Tree Projection
    # =========================================================================
    def test_algo_04_multi_account_virtual_tree_projection(self):
        """
        Algorithm 4: Recursively maps unified folders into isolated account folder
        IDs per Google Drive account, memoizing into Folder.account_folder_ids.
        """
        acct1 = models.StorageAccount(
            family_id=self.family.id, provider="google", email="d1@a.com", label="D1",
            status="active", priority=0, vault_folder_id="vault-d1"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id, provider="google", email="d2@a.com", label="D2",
            status="active", priority=1, vault_folder_id="vault-d2"
        )
        self.db.add_all([acct1, acct2])
        self.db.commit()

        parent_folder = models.Folder(name="Taxes", family_id=self.family.id, parent_id=None)
        self.db.add(parent_folder)
        self.db.commit()

        sub_folder = models.Folder(name="2026", family_id=self.family.id, parent_id=parent_folder.id)
        self.db.add(sub_folder)
        self.db.commit()

        mock_provider = MagicMock()
        mock_provider.find_or_create_folder.side_effect = lambda config, parent_folder_id, folder_name, db=None: f"cloud-{folder_name}-under-{parent_folder_id}"
        self.manager.providers["google"] = mock_provider

        # Resolve subfolder on Drive 1
        cloud_id_d1 = self.manager.ensure_folder_for_account(sub_folder.id, acct1, self.family, self.db)
        # Resolve subfolder on Drive 2
        cloud_id_d2 = self.manager.ensure_folder_for_account(sub_folder.id, acct2, self.family, self.db)

        self.assertNotEqual(cloud_id_d1, cloud_id_d2, "Each drive must have isolated cloud folder IDs")
        self.assertIn("vault-d1", cloud_id_d1)
        self.assertIn("vault-d2", cloud_id_d2)

        # Verify memoization
        self.db.refresh(sub_folder)
        self.assertEqual(sub_folder.account_folder_ids.get(str(acct1.id)), cloud_id_d1)
        self.assertEqual(sub_folder.account_folder_ids.get(str(acct2.id)), cloud_id_d2)

    # =========================================================================
    # ALGORITHM 5: Ancestor Cycle Detection in Directory Graphs
    # =========================================================================
    def test_algo_05_ancestor_cycle_detection_in_directory_graphs(self):
        """
        Algorithm 5: Traverses ancestor graph to prevent circular dependency loops
        when moving directories (moving a parent folder inside its own subfolder).
        """
        folder_a = models.Folder(name="FolderA", family_id=self.family.id, parent_id=None)
        self.db.add(folder_a)
        self.db.commit()

        folder_b = models.Folder(name="FolderB", family_id=self.family.id, parent_id=folder_a.id)
        self.db.add(folder_b)
        self.db.commit()

        folder_c = models.Folder(name="FolderC", family_id=self.family.id, parent_id=folder_b.id)
        self.db.add(folder_c)
        self.db.commit()

        # Attempt to move FolderA into FolderC (which is child of child of FolderA)
        res = self.client.patch(f"/api/folders/{folder_a.id}/move", json={"parent_id": folder_c.id}, headers=self.headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot move a folder inside its own subfolder", res.json().get("detail", ""))

    # =========================================================================
    # ALGORITHM 6: Batch-Scoped Cascade DFS Traversal (Soft-Delete & Restore)
    # =========================================================================
    def test_algo_06_batch_scoped_cascade_dfs_traversal(self):
        """
        Algorithm 6: Uses deletion_batch_id DFS recursion so restoring a parent folder
        only restores items soft-deleted in that batch, not items deleted prior.
        """
        parent = models.Folder(name="Projects", family_id=self.family.id, parent_id=None)
        self.db.add(parent)
        self.db.commit()

        # File 1 was deleted 1 week ago independently
        old_deleted_file = models.File(
            filename="old_draft.txt", file_type="text/plain", size_bytes=100,
            _file_id="f_old", local_file_id="f_old", family_id=self.family.id,
            uploader_id=self.admin.id, folder_id=parent.id,
            deleted_at=datetime.now(timezone.utc) - timedelta(days=7),
            deletion_batch_id="batch_old_111"
        )
        # File 2 is active
        active_file = models.File(
            filename="current.txt", file_type="text/plain", size_bytes=200,
            _file_id="f_curr", local_file_id="f_curr", family_id=self.family.id,
            uploader_id=self.admin.id, folder_id=parent.id
        )
        self.db.add_all([old_deleted_file, active_file])
        self.db.commit()

        # Delete parent folder
        del_res = self.client.delete(f"/api/folders/{parent.id}", headers=self.headers)
        self.assertEqual(del_res.status_code, 204)

        # Restore parent folder
        restore_res = self.client.post(f"/api/recycle-bin/folder/{parent.id}/restore", headers=self.headers)
        self.assertEqual(restore_res.status_code, 200)

        # active_file must be restored (deleted_at is None)
        self.db.refresh(active_file)
        self.assertIsNone(active_file.deleted_at)

        # old_deleted_file must REMAIN deleted because its batch_id did not match the parent's deletion batch!
        self.db.refresh(old_deleted_file)
        self.assertIsNotNone(old_deleted_file.deleted_at)

    # =========================================================================
    # ALGORITHM 7: Optimistic Task Leasing with Worker Heartbeats
    # =========================================================================
    def test_algo_07_optimistic_task_leasing_with_heartbeats(self):
        """
        Algorithm 7: Uses atomic conditional updates to lease sync tasks to workers
        and auto-expires stale leases after timeout.
        """
        file = models.File(
            filename="to_lease.pdf", file_type="application/pdf", size_bytes=100,
            _file_id="loc1", local_file_id="loc1", family_id=self.family.id,
            uploader_id=self.admin.id, storage_provider="local", pending_sync=True,
            pending_sync_at=datetime.now(timezone.utc)
        )
        self.db.add(file)
        self.db.commit()

        # Simulate Worker A acquiring lease
        worker_a = "worker-host1-111"
        now = datetime.now(timezone.utc)
        rows_a = self.db.query(models.File).filter(
            models.File.id == file.id,
            models.File.lock_acquired_at == None
        ).update({"lock_acquired_at": now, "lock_holder": worker_a}, synchronize_session=False)
        self.db.commit()
        self.assertEqual(rows_a, 1)

        # Simulate Worker B attempting to acquire the same file immediately -> must be rejected (0 rows)
        worker_b = "worker-host2-222"
        rows_b = self.db.query(models.File).filter(
            models.File.id == file.id,
            models.File.lock_acquired_at == None
        ).update({"lock_acquired_at": now, "lock_holder": worker_b}, synchronize_session=False)
        self.db.commit()
        self.assertEqual(rows_b, 0, "Worker B must not acquire already leased file")

        # Expire lease (simulating Worker A crashed > 10 minutes ago)
        stale_time = now - timedelta(minutes=15)
        self.db.query(models.File).filter(models.File.id == file.id).update(
            {"lock_acquired_at": stale_time}, synchronize_session=False
        )
        self.db.commit()

        # Worker B retries with timeout check (lock_acquired_at < now - 10m) -> succeeds
        timeout_limit = now - timedelta(minutes=10)
        rows_reacquired = self.db.query(models.File).filter(
            models.File.id == file.id,
            models.File.lock_acquired_at < timeout_limit
        ).update({"lock_acquired_at": now, "lock_holder": worker_b}, synchronize_session=False)
        self.db.commit()
        self.assertEqual(rows_reacquired, 1, "Expired lease must be safely re-acquirable")

    # =========================================================================
    # ALGORITHM 8: Two-Phase Commit & Crash Recovery
    # =========================================================================
    def test_algo_08_two_phase_commit_and_crash_recovery(self):
        """
        Algorithm 8: Recovers orphaned local copies for files whose cloud commits
        succeeded before local deletion could execute.
        """
        file = models.File(
            filename="committed_cloud.pdf", file_type="application/pdf", size_bytes=500,
            _file_id="cloud_123", cloud_file_id="cloud_123", google_drive_file_id="cloud_123",
            storage_provider="google", local_file_id="orphaned_local_123",
            family_id=self.family.id, uploader_id=self.admin.id, pending_sync=False
        )
        self.db.add(file)
        self.db.commit()

        mock_local_provider = MagicMock()
        mock_local_provider.delete_file.return_value = True
        self.manager.providers["local"] = mock_local_provider

        # Run crash recovery algorithm
        self.manager.recover_interrupted_syncs(self.db)

        # Local file copy must be deleted and local_file_id cleared
        self.db.refresh(file)
        self.assertIsNone(file.local_file_id, "Crash recovery must clean up orphaned local copy")
        mock_local_provider.delete_file.assert_called_once()

    # =========================================================================
    # ALGORITHM 9: Sliding Window Log Rate Limiting
    # =========================================================================
    def test_algo_09_sliding_window_log_rate_limiting(self):
        """
        Algorithm 9: Maintains timestamp array, prunes expired entries,
        and enforces request threshold within sliding window.
        """
        limiter = InMemoryRateLimiter()
        key = "test_ip_127.0.0.1"

        # Allow 3 requests per 2-second window
        self.assertFalse(limiter.is_rate_limited(key, max_requests=3, window_seconds=2))
        self.assertFalse(limiter.is_rate_limited(key, max_requests=3, window_seconds=2))
        self.assertFalse(limiter.is_rate_limited(key, max_requests=3, window_seconds=2))
        # 4th request must be rate-limited
        self.assertTrue(limiter.is_rate_limited(key, max_requests=3, window_seconds=2))

        # Reset key
        limiter.reset_key(key)
        self.assertFalse(limiter.is_rate_limited(key, max_requests=3, window_seconds=2))

    # =========================================================================
    # ALGORITHM 10: Exponential Backoff with Jitter for Cloud APIs
    # =========================================================================
    def test_algo_10_exponential_backoff_with_jitter(self):
        """
        Algorithm 10: Automatically retries on transient connection resets
        and HTTP 429/5xx codes with increasing delay.
        """
        provider = GoogleDriveProvider()
        calls = []

        def failing_function(service):
            calls.append(time.time())
            if len(calls) < 3:
                raise ConnectionResetError("wsarecv: An existing connection was forcibly closed by the remote host")
            return "SUCCESS"

        with patch.object(provider, "_get_client", return_value=MagicMock()):
            with patch("time.sleep", return_value=None) as mock_sleep:
                result = provider._execute_with_retry(failing_function, {}, db=None, max_retries=3)
                self.assertEqual(result, "SUCCESS")
                self.assertEqual(len(calls), 3)
                # Verify retry sleep intervals: 1.5s then 3.0s
                mock_sleep.assert_any_call(1.5)
                mock_sleep.assert_any_call(3.0)

    # =========================================================================
    # ALGORITHM 11: Fernet Symmetric Key Derivation & Encryption
    # =========================================================================
    def test_algo_11_fernet_symmetric_key_derivation_and_encryption(self):
        """
        Algorithm 11: Derives 256-bit key from secret, performs AES-128-CBC + HMAC
        encryption of OAuth tokens, and rejects tampered ciphertexts.
        """
        secret_config = {
            "client_id": "google_client_123.apps.googleusercontent.com",
            "refresh_token": "1//04_secret_oauth_refresh_token",
            "access_token": "ya29.secret_access_token"
        }

        # Encrypt
        encrypted = encrypt_config(secret_config)
        self.assertIsInstance(encrypted, str)
        self.assertNotIn("secret_oauth_refresh_token", encrypted)

        # Decrypt
        decrypted = decrypt_config(encrypted)
        self.assertEqual(decrypted["refresh_token"], secret_config["refresh_token"])

        # Tampering test: corrupting ciphertext must gracefully fail without throwing uncaught exceptions
        corrupted = encrypted[:-5] + "AAAAA"
        fallback = decrypt_config(corrupted)
        self.assertEqual(fallback, {})

    # =========================================================================
    # ALGORITHM 12: Single-Session JTI Revocation & Rotation
    # =========================================================================
    def test_algo_12_single_session_jti_revocation_and_rotation(self):
        """
        Algorithm 12: Enforces single active session per user by validating
        cryptographic JTI in token against user's stored current_token_jti.
        """
        # Session 1 login
        res1 = self.client.post("/api/auth/login", json={"email": self.admin.email, "password": "AdminPass123"})
        self.assertEqual(res1.status_code, 200)
        token1 = res1.json()["access_token"]

        # Session 1 token works
        check1 = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token1}"})
        self.assertEqual(check1.status_code, 200)

        # Session 2 login (e.g. new device/tab)
        res2 = self.client.post("/api/auth/login", json={"email": self.admin.email, "password": "AdminPass123"})
        self.assertEqual(res2.status_code, 200)
        token2 = res2.json()["access_token"]

        # Session 1 token MUST be immediately revoked (JTI rotation)
        check1_revoked = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token1}"})
        self.assertEqual(check1_revoked.status_code, 401)
        self.assertEqual(check1_revoked.json().get("detail"), "Could not validate credentials")

        # Session 2 token works
        check2 = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token2}"})
        self.assertEqual(check2.status_code, 200)

    # =========================================================================
    # ALGORITHM 13: Magic-Byte Content Signature Verification
    # =========================================================================
    def test_algo_13_magic_byte_content_signature_verification(self):
        """
        Algorithm 13: Inspects binary container headers to detect file spoofing
        across PDF, PNG, JPEG, Office XML, and video container formats.
        """
        # Valid headers
        self.assertTrue(validate_file_content_signature(b"%PDF-1.4 header", ".pdf"))
        self.assertTrue(validate_file_content_signature(b"\x89PNG\r\n\x1a\nrest", ".png"))
        self.assertTrue(validate_file_content_signature(b"\xff\xd8\xff\xe0rest", ".jpg"))
        self.assertTrue(validate_file_content_signature(b"PK\x03\x04zipcontent", ".docx"))
        self.assertTrue(validate_file_content_signature(b"\x00\x00\x00 ftypmp42", ".mp4"))
        self.assertTrue(validate_file_content_signature(b"\x1a\x45\xdf\xa3matroska", ".mkv"))

        # Spoofed headers (e.g. PHP script or exe disguised as PDF/PNG/MP4)
        self.assertFalse(validate_file_content_signature(b"<?php echo 'malware'; ?>", ".pdf"))
        self.assertFalse(validate_file_content_signature(b"MZ\x90\x00exe_binary", ".png"))
        self.assertFalse(validate_file_content_signature(b"#!/bin/bash dangerous", ".mp4"))

    # =========================================================================
    # ALGORITHM 14: RFC 7233 Range Streaming & Oldest-Expiry Cache Eviction
    # =========================================================================
    def test_algo_14_rfc7233_range_streaming_and_oldest_expiry_cache(self):
        """
        Algorithm 14: Validates RFC 7233 byte-range seeking for media streaming,
        and thread-safe TTL cache with earliest-expiring entry eviction at capacity.
        """
        # Part A: TTL Cache with Oldest-Expiry Eviction
        cache = TTLCache(default_ttl=10, max_size=3)
        cache.set("key1", "val1", ttl=5)   # expires at t+5
        cache.set("key2", "val2", ttl=10)  # expires at t+10
        cache.set("key3", "val3", ttl=2)   # expires at t+2 (earliest expiry)

        # Cache is at capacity (3 items). Adding key4 must evict key3 (earliest expiry)
        cache.set("key4", "val4", ttl=15)
        self.assertIsNone(cache.get("key3"), "Oldest-expiring key3 must be evicted")
        self.assertEqual(cache.get("key1"), "val1")
        self.assertEqual(cache.get("key2"), "val2")
        self.assertEqual(cache.get("key4"), "val4")

        # Part B: Range Streaming Generator
        file_bytes = b"0123456789ABCDEF" * 100 # 1600 bytes
        file_obj = models.File(
            filename="stream.mp4", file_type="video/mp4", size_bytes=len(file_bytes),
            _file_id="local_stream_1", local_file_id="local_stream_1",
            storage_provider="local", family_id=self.family.id, uploader_id=self.admin.id
        )
        self.db.add(file_obj)
        self.db.commit()

        mock_local = MagicMock()
        mock_local.stream_file.return_value = (io.BytesIO(file_bytes[100:300]), 100, 299, len(file_bytes))
        self.manager.providers["local"] = mock_local

        stream, provider = self.manager.stream_file(file_obj, {}, db=self.db, range_header="bytes=100-299")
        generator, start, end, total = stream
        self.assertEqual(start, 100)
        self.assertEqual(end, 299)
        self.assertEqual(total, 1600)
        self.assertEqual(provider, "local")


if __name__ == "__main__":
    unittest.main()
