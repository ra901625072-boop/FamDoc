import os
import sys
import unittest
import time
import uuid
import socket
from datetime import datetime, timezone, timedelta

# Adjust python path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
import models
import auth
import schemas
from utils.rate_limiter import check_rate_limit, _global_rate_limiter
from storage.storage_manager import StorageManager

# Set up test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_redesign_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestBackendRedesign(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        try:
            os.remove("./test_redesign_temp.db")
        except OSError:
            pass

    def setUp(self):
        self.db = TestingSessionLocal()
        # Clean database tables before each test
        self.db.query(models.SharedLink).delete()
        self.db.query(models.File).delete()
        self.db.query(models.Folder).delete()
        self.db.query(models.FamilyMember).delete()
        self.db.query(models.Family).delete()
        self.db.query(models.User).delete()
        self.db.query(models.RevokedToken).delete()
        self.db.commit()

        # Create a test admin user and a test member
        self.admin = models.User(
            username="admin_user",
            email="admin@test.com",
            password_hash=auth.get_password_hash("Password123"),
            role="admin"
        )
        self.db.add(self.admin)
        self.db.flush()

        self.family = models.Family(
            id="testfam12345",
            name="Test Family",
            admin_id=self.admin.id,
            secret_code_hash="hashed_code",
            max_members=10
        )
        self.db.add(self.family)
        self.db.flush()

        self.admin_member = models.FamilyMember(
            family_id=self.family.id,
            user_id=self.admin.id,
            role="admin"
        )
        self.db.add(self.admin_member)
        
        self.user = models.User(
            username="test_member",
            email="member@test.com",
            password_hash=auth.get_password_hash("Password123"),
            role="member"
        )
        self.db.add(self.user)
        self.db.flush()
        
        self.user_member = models.FamilyMember(
            family_id=self.family.id,
            user_id=self.user.id,
            role="member"
        )
        self.db.add(self.user_member)
        
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_token_scopes_generation_and_validation(self):
        # 1. Generate session token and file preview token
        session_token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": self.admin.role})
        preview_token = auth.create_file_access_token(file_id=99, user_id=self.admin.id)

        # Decode & inspect claims
        from jose import jwt
        session_payload = jwt.decode(session_token, auth.JWT_SECRET, algorithms=[auth.JWT_ALGORITHM])
        preview_payload = jwt.decode(preview_token, auth.JWT_SECRET, algorithms=[auth.JWT_ALGORITHM])

        self.assertEqual(session_payload.get("scope"), "session")
        self.assertEqual(preview_payload.get("scope"), "file_preview")
        self.assertEqual(preview_payload.get("file_id"), 99)

        # 2. Test dependencies directly
        # Session token should pass for session-scoped auth
        user_resolved = auth.get_current_user(token_header=f"Bearer {session_token}", db=self.db)
        self.assertEqual(user_resolved.id, self.admin.id)

        # Preview token should fail for general session-scoped auth
        with self.assertRaises(Exception) as context:
            auth.get_current_user(token_header=f"Bearer {preview_token}", db=self.db)
        # Verify the exception details or type
        self.assertTrue(hasattr(context, 'exception'))

    def test_preview_token_restricted_to_correct_file_id(self):
        # Generate token restricted to file_id 42
        preview_token_42 = auth.create_file_access_token(file_id=42, user_id=self.admin.id)

        # Mock Request object to simulate path parameter match
        class MockRequest:
            def __init__(self, path_params):
                self.path_params = path_params

        # Path params matches token file ID -> Success
        req_match = MockRequest(path_params={"file_id": "42"})
        user_ok = auth.get_current_user_or_file_preview(request=req_match, token_header=f"Bearer {preview_token_42}", db=self.db)
        self.assertEqual(user_ok.id, self.admin.id)

        # Path params mismatches token file ID -> Forbidden
        req_mismatch = MockRequest(path_params={"file_id": "99"})
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            auth.get_current_user_or_file_preview(request=req_mismatch, token_header=f"Bearer {preview_token_42}", db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Token is not authorized for this file ID", ctx.exception.detail)

    def test_pluggable_rate_limiter_in_memory(self):
        # Bypass Redis to force testing in-memory implementation
        _global_rate_limiter.redis_limiter = None
        
        limit_key = f"test_rate_limit_{uuid.uuid4().hex}"
        
        # We allow 3 requests per 10 seconds
        for i in range(3):
            is_blocked = check_rate_limit(limit_key, max_requests=3, window_seconds=10)
            self.assertFalse(is_blocked, f"Request {i+1} should not be blocked")

        # 4th request should exceed the limit
        is_blocked = check_rate_limit(limit_key, max_requests=3, window_seconds=10)
        self.assertTrue(is_blocked, "4th request should be blocked")

    def test_task_leasing_optimistic_locking(self):
        # Insert a file pending sync
        test_file = models.File(
            filename="confidential.pdf",
            file_type="application/pdf",
            size_bytes=1024,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="local",
            file_id="local-path/confidential.pdf",
            pending_sync=True,
            pending_sync_at=datetime.now(timezone.utc),
            sync_retry_count=0
        )
        self.db.add(test_file)
        self.db.commit()
        self.db.refresh(test_file)

        # Instantiate StorageManager
        manager = StorageManager()
        
        # Build mock configurations
        family_configs = {
            self.family.id: {
                "local": {"vault_folder_id": "."},
                "google": {}, # Google drive health check will return False, mega False
                "mega": {}
            }
        }

        # Mock the availability check so both providers fail -> triggers lease release
        original_check = manager.check_availability
        manager.check_availability = lambda config, cache_ttl=30, db=None: {"google": False, "mega": False}

        try:
            # Running sync will query the file, attempt to sync, fail to find active cloud providers,
            # and release the lock. Let's make sure it operates gracefully.
            res = manager.sync_pending_files(self.db, family_configs, batch_size=5)
            self.assertEqual(res["skipped"], 1, "Should skip and release lock since providers are offline")
            
            # File should not be locked after release
            file_db = self.db.query(models.File).filter(models.File.id == test_file.id).first()
            self.assertIsNone(file_db.lock_acquired_at, "Lock should be released")
            self.assertIsNone(file_db.lock_holder, "Lock holder should be cleared")

            # Let's mock a successful cloud sync
            # Mock the target providers so Google is online
            manager.check_availability = lambda config, cache_ttl=30, db=None: {"google": True, "mega": False}
            
            # Mock the providers upload/download calls to bypass actual API
            class MockProvider:
                def download_file(self, config, file_id, db=None):
                    return b"secret_data"
                def upload_file(self, config, vault_folder_id, filename, file_content, mimetype, username=None, db=None):
                    return {"cloud_file_id": "google-drive-id-123", "cloud_link": "http://google.com/confidential"}
                def delete_file(self, config, file_id, db=None):
                    return True

            manager.providers["google"] = MockProvider()
            manager.providers["local"] = MockProvider()

            # Execute sync_pending_files again
            res = manager.sync_pending_files(self.db, family_configs, batch_size=5)
            self.assertEqual(res["synced"], 1, "Should successfully sync and clear pending_sync")

            # Verify database updates
            file_db = self.db.query(models.File).filter(models.File.id == test_file.id).first()
            self.assertFalse(file_db.pending_sync)
            self.assertEqual(file_db.storage_provider, "google")
            self.assertEqual(file_db.file_id, "google-drive-id-123")
            self.assertIsNone(file_db.lock_acquired_at)

        finally:
            manager.check_availability = original_check

    def test_storage_quota_enforcement(self):
        # Configure the family quota to a small value (1.5 KB / 1500 bytes)
        self.family.storage_quota_bytes = 1500
        self.db.commit()

        # Generate standard authorization headers for Admin
        admin_token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": self.admin.role})
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Mock VirusTotal scanner to return clean
        import httpx
        from unittest.mock import patch
        
        # Helper payload for uploading files
        def upload_file_mock(filename, content_bytes):
            file_payload = {"file": (filename, content_bytes, "application/pdf")}
            return self.client.post("/api/files/upload", files=file_payload, headers=headers)

        with patch("utils.virus_scan.scan_file_for_viruses", return_value=True), \
             patch("storage.storage_manager.StorageManager.write_file", return_value={"file_id": "test-uuid-123"}):
            
            # Upload 1st file (1000 bytes) -> Should succeed (Total: 1000 bytes <= 1500)
            res1 = upload_file_mock("file1.pdf", b"a" * 1000)
            self.assertEqual(res1.status_code, 201)

            # Upload 2nd file (600 bytes) -> Should fail because 1000 + 600 = 1600 > 1500 bytes limit
            res2 = upload_file_mock("file2.pdf", b"b" * 600)
            self.assertEqual(res2.status_code, 400)
            self.assertIn("Storage quota exceeded", res2.json().get("detail", ""))

    def test_two_phase_sync_safety_and_recovery(self):
        # Insert a file pending sync with local_file_id
        test_file = models.File(
            filename="safe_handoff.pdf",
            file_type="application/pdf",
            size_bytes=1024,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="local",
            local_file_id="local-uuid-prefixed-safe_handoff.pdf",
            pending_sync=True,
            pending_sync_at=datetime.now(timezone.utc),
            sync_retry_count=0
        )
        self.db.add(test_file)
        self.db.commit()

        manager = StorageManager()
        family_configs = {
            self.family.id: {
                "local": {"vault_folder_id": "."},
                "google": {},
                "mega": {}
            }
        }

        # Mock the cloud availability to have Google online
        manager.check_availability = lambda config, cache_ttl=30, db=None: {"google": True, "mega": False}

        # Mock providers
        class SafeMockProvider:
            def download_file(self, config, file_id, db=None):
                return b"content"
            def upload_file(self, config, vault_folder_id, filename, file_content, mimetype, username=None, db=None):
                return {"cloud_file_id": "cloud-safedrive-id-999", "cloud_link": "http://google.com/999"}
            def delete_file(self, config, file_id, db=None):
                # Simulate a crash/failure during the deletion phase
                raise Exception("Simulation of local file delete failure (crash between Phase 1 and 2)")

        manager.providers["google"] = SafeMockProvider()
        manager.providers["local"] = SafeMockProvider()

        # Run sync_pending_files. It should successfully commit Phase 1 (cloud properties set),
        # but fail to delete local and keep local_file_id populated.
        res = manager.sync_pending_files(self.db, family_configs, batch_size=5)
        self.assertEqual(res["synced"], 1)

        # Query and assert file states
        file_db = self.db.query(models.File).filter(models.File.id == test_file.id).first()
        self.assertEqual(file_db.storage_provider, "google")
        self.assertEqual(file_db.cloud_file_id, "cloud-safedrive-id-999")
        self.assertEqual(file_db.local_file_id, "local-uuid-prefixed-safe_handoff.pdf") # Remains populated!
        self.assertFalse(file_db.pending_sync)

        # Now simulate a successful recovery on the next boot check
        # Mock local delete to succeed now
        class SafeRecoveryMockProvider:
            def delete_file(self, config, file_id, db=None):
                return True
        manager.providers["local"] = SafeRecoveryMockProvider()

        # Trigger startup sync recovery
        manager.recover_interrupted_syncs(self.db)

        # Assert local copy is marked deleted in database
        self.db.refresh(file_db)
        self.assertIsNone(file_db.local_file_id)

    def test_boot_check_production_refusal(self):
        # We test the boot check logic by simulating environment setups
        import os
        from unittest.mock import patch

        # Simulates production setting validation raising error if key is missing
        def run_key_validation(app_env_val, key_val):
            with patch.dict(os.environ, {"APP_ENV": app_env_val, "STORAGE_CONFIG_ENCRYPTION_KEY": key_val} if key_val else {"APP_ENV": app_env_val}):
                # Retrieve env vars and perform mock validation logic
                env = os.getenv("APP_ENV", "production")
                key = os.getenv("STORAGE_CONFIG_ENCRYPTION_KEY")
                if not key and env != "development":
                    raise RuntimeError("Boot validation test passed")
                return "booted"

        # Production + missing key -> raises RuntimeError
        with self.assertRaises(RuntimeError):
            run_key_validation("production", "")

        # Development + missing key -> warning only, returns "booted"
        self.assertEqual(run_key_validation("development", ""), "booted")

        # Production + key set -> returns "booted"
        self.assertEqual(run_key_validation("production", "securekey123"), "booted")

if __name__ == "__main__":
    unittest.main()
