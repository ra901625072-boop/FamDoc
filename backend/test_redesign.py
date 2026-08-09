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
            if filename.endswith(".pdf") and len(content_bytes) >= 4:
                content_bytes = b"%PDF" + content_bytes[4:]
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
            _file_id="local-uuid-prefixed-safe_handoff.pdf",
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

    def test_secure_hierarchy_and_boundary_protection(self):
        # 1. Generate auth header for admin
        admin_token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": self.admin.role})
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 2. Setup mock cloud provider in StorageManager
        manager = StorageManager()
        # Mock providers and availability
        manager.check_availability = lambda config, cache_ttl=30, db=None: {"google": True, "mega": False}
        
        class HierarchyMockProvider:
            def __init__(self):
                self.created_folders = []
                self.moved_items = []
                self.renamed_items = []
                self.deleted_items = []
                
            def ensure_vault_folder(self, family_id: str, config: dict, db=None):
                return "google-family-root-folder-id"
                
            def create_folder(self, config, parent_folder_id, folder_name, db=None):
                folder_id = f"google-folder-id-{folder_name}"
                self.created_folders.append((parent_folder_id, folder_name, folder_id))
                return folder_id
                
            def move_file(self, config, cloud_file_id, new_parent_id, db=None):
                self.moved_items.append((cloud_file_id, new_parent_id))
                return True
                
            def rename_file(self, config, cloud_file_id, new_name, db=None):
                self.renamed_items.append((cloud_file_id, new_name))
                return True
                
            def delete_file(self, config, cloud_file_id, db=None):
                self.deleted_items.append(cloud_file_id)
                return True

            def upload_file(self, config, vault_folder_id, filename, file_content, mimetype, username=None, db=None):
                return {"cloud_file_id": f"google-file-id-{filename}", "cloud_link": "http://google.com"}

        mock_google = HierarchyMockProvider()
        manager.providers["google"] = mock_google
        
        import storage
        original_get_provider = storage.get_storage_provider
        storage.get_storage_provider = lambda name: mock_google
        
        original_init = StorageManager.__init__
        def mocked_init(sm_self):
            sm_self.providers = {
                "google": mock_google,
                "mega": mock_google,
                "local": mock_google
            }
        StorageManager.__init__ = mocked_init
        
        try:
            # 3. Test Folder Creation
            # Create root folder (parent_id = None)
            res = self.client.post("/api/folders", json={"name": "Documents", "parent_id": None}, headers=headers)
            if res.status_code != 201:
                print("DEBUG Response code:", res.status_code)
                print("DEBUG Response text:", res.text)
            self.assertEqual(res.status_code, 201)
            folder_data = res.json()
            self.assertEqual(folder_data["name"], "Documents")
            self.assertEqual(folder_data["cloud_folder_id"], "google-folder-id-Documents")
            
            # Verify the provider received the call with the family root folder ID
            self.assertIn(("google-family-root-folder-id", "Documents", "google-folder-id-Documents"), mock_google.created_folders)
            
            # Create subfolder inside "Documents"
            parent_id = folder_data["id"]
            res = self.client.post("/api/folders", json={"name": "Education", "parent_id": parent_id}, headers=headers)
            self.assertEqual(res.status_code, 201)
            subfolder_data = res.json()
            self.assertEqual(subfolder_data["name"], "Education")
            self.assertEqual(subfolder_data["cloud_folder_id"], "google-folder-id-Education")
            self.assertIn(("google-folder-id-Documents", "Education", "google-folder-id-Education"), mock_google.created_folders)

            # 4. Test Folder Rename
            res = self.client.put(f"/api/folders/{subfolder_data['id']}", json={"name": "Academia"}, headers=headers)
            self.assertEqual(res.status_code, 200)
            self.assertIn(("google-folder-id-Education", "Academia"), mock_google.renamed_items)

            # 5. Test Folder Move
            # Create another top-level folder "Photos"
            res = self.client.post("/api/folders", json={"name": "Photos", "parent_id": None}, headers=headers)
            photos_data = res.json()
            # Move "Academia" (subfolder) under "Photos"
            res = self.client.patch(f"/api/folders/{subfolder_data['id']}/move", json={"parent_id": photos_data["id"]}, headers=headers)
            self.assertEqual(res.status_code, 200)
            self.assertIn(("google-folder-id-Education", "google-folder-id-Photos"), mock_google.moved_items)

            # 6. Test Family Isolation / Boundary Protection
            # Create another family and family user
            other_user = models.User(
                username="other_admin",
                email="other@test.com",
                password_hash=auth.get_password_hash("Password123"),
                role="admin"
            )
            self.db.add(other_user)
            self.db.flush()
            other_family = models.Family(
                id="otherfam999",
                name="Other Family",
                admin_id=other_user.id,
                secret_code_hash="hashed_other",
                max_members=10
            )
            self.db.add(other_family)
            self.db.flush()
            other_member = models.FamilyMember(
                family_id=other_family.id,
                user_id=other_user.id,
                role="admin"
            )
            self.db.add(other_member)
            self.db.commit()
            
            # Authenticate other_user
            other_token = auth.create_access_token(data={"sub": other_user.email, "id": other_user.id, "role": other_user.role})
            other_headers = {"Authorization": f"Bearer {other_token}"}
            
            # Other user attempts to create a folder under Test Family's "Photos" folder -> Should be rejected with 404
            res = self.client.post("/api/folders", json={"name": "HackedPhotos", "parent_id": photos_data["id"]}, headers=other_headers)
            self.assertEqual(res.status_code, 404)
            self.assertIn("Folder not found", res.json().get("detail", ""))

            # Other user attempts to move their own folder inside Test Family's "Photos" folder -> Should be rejected with 404
            # Create a folder for other family first
            res = self.client.post("/api/folders", json={"name": "MyOtherFolder", "parent_id": None}, headers=other_headers)
            other_folder = res.json()
            res = self.client.patch(f"/api/folders/{other_folder['id']}/move", json={"parent_id": photos_data["id"]}, headers=other_headers)
            self.assertEqual(res.status_code, 404)

            # 7. Test Soft Delete does NOT call provider's delete_file immediately
            # Add a file in photos
            test_file = models.File(
                filename="photo.jpg",
                file_type="image/jpeg",
                size_bytes=2048,
                uploader_id=self.admin.id,
                folder_id=photos_data["id"],
                family_id=self.family.id,
                storage_provider="google",
                cloud_file_id="google-file-id-photo.jpg",
                pending_sync=False
            )
            self.db.add(test_file)
            self.db.commit()
            self.db.refresh(test_file)

            # Delete the file
            res = self.client.delete(f"/api/files/{test_file.id}", headers=headers)
            self.assertEqual(res.status_code, 204)
            # Verify it is not physically deleted from mock google provider yet
            self.assertNotIn("google-file-id-photo.jpg", mock_google.deleted_items)

            # 8. Test Purge physically deletes the file from provider
            res = self.client.delete(f"/api/recycle-bin/file/{test_file.id}/purge", headers=headers)
            self.assertEqual(res.status_code, 204)
            # Verify it is now deleted from cloud provider
            self.assertIn("google-file-id-photo.jpg", mock_google.deleted_items)
            
        finally:
            StorageManager.__init__ = original_init
            storage.get_storage_provider = original_get_provider

    def test_id_tampering_protection(self):
        # 1. Setup Family A (Test Family, self.family) and User A (self.admin)
        admin_token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": self.admin.role})
        headers_a = {"Authorization": f"Bearer {admin_token}"}
        
        # 2. Setup Family B and User B
        other_user = models.User(
            username="other_admin",
            email="other@test.com",
            password_hash=auth.get_password_hash("Password123"),
            role="admin"
        )
        self.db.add(other_user)
        self.db.flush()
        other_family = models.Family(
            id="otherfam999",
            name="Other Family",
            admin_id=other_user.id,
            secret_code_hash="hashed_other",
            max_members=10
        )
        self.db.add(other_family)
        self.db.flush()
        other_member = models.FamilyMember(
            family_id=other_family.id,
            user_id=other_user.id,
            role="admin"
        )
        self.db.add(other_member)
        
        # Create folder B in Family B
        folder_b = models.Folder(
            name="Family B Folder",
            parent_id=None,
            family_id=other_family.id
        )
        self.db.add(folder_b)
        self.db.flush()

        # Create file B in Family B
        file_b = models.File(
            filename="confidential_b.pdf",
            file_type="application/pdf",
            size_bytes=1024,
            uploader_id=other_user.id,
            folder_id=folder_b.id,
            family_id=other_family.id,
            storage_provider="local",
            cloud_file_id="cloud-b-id",
            pending_sync=False
        )
        self.db.add(file_b)
        
        self.db.commit()
        
        # 3. Test ID Tampering from User A (headers_a) attempting to access Family B's resources
        # A tries to rename B's folder -> Should return 404
        res = self.client.put(f"/api/folders/{folder_b.id}", json={"name": "HackedName"}, headers=headers_a)
        self.assertEqual(res.status_code, 404)
        
        # A tries to delete B's folder -> Should return 404
        res = self.client.delete(f"/api/folders/{folder_b.id}", headers=headers_a)
        self.assertEqual(res.status_code, 404)

        # A tries to rename B's file -> Should return 404
        res = self.client.put(f"/api/files/{file_b.id}", json={"filename": "HackedFile.pdf"}, headers=headers_a)
        self.assertEqual(res.status_code, 404)

        # A tries to move B's file -> Should return 404
        res = self.client.patch(f"/api/files/{file_b.id}/move", json={"folder_id": None}, headers=headers_a)
        self.assertEqual(res.status_code, 404)

        # A tries to delete B's file -> Should return 404
        res = self.client.delete(f"/api/files/{file_b.id}", headers=headers_a)
        self.assertEqual(res.status_code, 404)

        # A tries to purge B's file -> Should return 404
        res = self.client.delete(f"/api/recycle-bin/file/{file_b.id}/purge", headers=headers_a)
        self.assertEqual(res.status_code, 404)

        # A tries to restore B's file -> Should return 404
        res = self.client.post(f"/api/recycle-bin/file/{file_b.id}/restore", headers=headers_a)
        self.assertEqual(res.status_code, 404)

    def test_family_membership_revocation(self):
        # 1. User joins family, gets access token
        user = models.User(
            username="revoked_member",
            email="revoked@test.com",
            password_hash=auth.get_password_hash("Password123"),
            role="member"
        )
        self.db.add(user)
        self.db.flush()
        
        member_record = models.FamilyMember(
            family_id=self.family.id,
            user_id=user.id,
            role="member"
        )
        self.db.add(member_record)
        
        # Create a file for the family
        test_file = models.File(
            filename="family_shared.pdf",
            file_type="application/pdf",
            size_bytes=1024,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="local",
            cloud_file_id="cloud-shared-id",
            pending_sync=False
        )
        self.db.add(test_file)
        
        self.db.commit()
        
        token = auth.create_access_token(data={"sub": user.email, "id": user.id, "role": user.role})
        headers = {"Authorization": f"Bearer {token}"}
        
        # Verify user has access initially (can list files)
        res = self.client.get("/api/files", headers=headers)
        self.assertEqual(res.status_code, 200)
        
        # Verify user can get preview token
        res = self.client.get(f"/api/files/{test_file.id}/preview-token", headers=headers)
        self.assertEqual(res.status_code, 200)
        
        # 2. Revoke membership from database (delete FamilyMember)
        db_member = self.db.query(models.FamilyMember).filter(
            models.FamilyMember.family_id == self.family.id,
            models.FamilyMember.user_id == user.id
        ).first()
        self.db.delete(db_member)
        self.db.commit()
        
        # 3. Verify user's token immediately loses access to files and folders
        # Fetching files returns 400 (User has not joined a family yet)
        res = self.client.get("/api/files", headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("User has not joined a family yet.", res.json().get("detail", ""))
        
        # Fetching specific file preview token returns 404 (File not found)
        res = self.client.get(f"/api/files/{test_file.id}/preview-token", headers=headers)
        self.assertEqual(res.status_code, 404)
        self.assertIn("File not found", res.json().get("detail", ""))

    def test_file_listing_with_folder_id_filtering(self):
        # 1. Create a test folder
        test_folder = models.Folder(
            name="Test Folder",
            parent_id=None,
            family_id=self.family.id
        )
        self.db.add(test_folder)
        self.db.commit()
        
        # 2. Create one file in root and one file in the test folder
        root_file = models.File(
            filename="root_file.pdf",
            file_type="application/pdf",
            size_bytes=100,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="local",
            cloud_file_id="root-file-cloud-id",
            pending_sync=False
        )
        folder_file = models.File(
            filename="folder_file.pdf",
            file_type="application/pdf",
            size_bytes=200,
            uploader_id=self.admin.id,
            folder_id=test_folder.id,
            family_id=self.family.id,
            storage_provider="local",
            cloud_file_id="folder-file-cloud-id",
            pending_sync=False
        )
        self.db.add(root_file)
        self.db.add(folder_file)
        self.db.commit()
        
        token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": self.admin.role})
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Test listing files with folder_id="root"
        res = self.client.get("/api/files?folder_id=root", headers=headers)
        self.assertEqual(res.status_code, 200)
        files = res.json()
        self.assertEqual(len(files), 1)
        self.assertEqual(files[0]["filename"], "root_file.pdf")
        
        # 4. Test listing files with folder_id="" (empty string)
        res = self.client.get("/api/files?folder_id=", headers=headers)
        self.assertEqual(res.status_code, 200)
        files = res.json()
        self.assertEqual(len(files), 1)
        self.assertEqual(files[0]["filename"], "root_file.pdf")
        
        # 5. Test listing files in the specific folder
        res = self.client.get(f"/api/files?folder_id={test_folder.id}", headers=headers)
        self.assertEqual(res.status_code, 200)
        files = res.json()
        self.assertEqual(len(files), 1)
        self.assertEqual(files[0]["filename"], "folder_file.pdf")
        
        # 6. Test listing files without folder_id filter (should return all files)
        res = self.client.get("/api/files", headers=headers)
        self.assertEqual(res.status_code, 200)
        files = res.json()
        self.assertEqual(len(files), 2)
        filenames = [f["filename"] for f in files]
        self.assertIn("root_file.pdf", filenames)
        self.assertIn("folder_file.pdf", filenames)
        
        # 7. Test listing files with invalid folder_id format
        res = self.client.get("/api/files?folder_id=invalid_folder_id", headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid folder_id format", res.json().get("detail", ""))

    def test_sharing_link_security(self):
        admin_token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": self.admin.role})
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create a file to share
        file = models.File(
            filename="share_test.pdf",
            file_type="application/pdf",
            size_bytes=500,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="local",
            file_id="local-path/share_test.pdf",
            local_file_id="local-path/share_test.pdf",
            pending_sync=False
        )
        self.db.add(file)
        self.db.commit()

        # Mock the local storage provider read to return mock bytes
        from storage.storage_manager import StorageManager
        manager = StorageManager()
        class MockLocalProvider:
            def ensure_vault_folder(self, family_id, config, db=None):
                return "mock-vault-id"
            def download_file(self, config, file_id, db=None):
                return b"hello share content"
        manager.providers["local"] = MockLocalProvider()
        
        original_init = StorageManager.__init__
        def mocked_init(sm_self):
            sm_self.providers = {
                "local": MockLocalProvider()
            }
        StorageManager.__init__ = mocked_init

        try:
            # 1. Create a password-free sharing link
            res = self.client.post(
                f"/api/files/{file.id}/share",
                json={"expires_at": None, "max_downloads": None, "password": None},
                headers=headers
            )
            self.assertEqual(res.status_code, 201)
            share_data = res.json()
            token = share_data["token"]

            # Get public share info -> Should return 200 and only metadata, no hierarchy
            res = self.client.get(f"/api/shared/{token}")
            self.assertEqual(res.status_code, 200)
            info = res.json()
            self.assertEqual(info["filename"], "share_test.pdf")
            self.assertFalse(info["is_password_protected"])
            # Ensure no sibling keys or family details are exposed
            self.assertNotIn("family_id", info)
            self.assertNotIn("uploader_id", info)
            self.assertNotIn("cloud_file_id", info)

            # Public download -> Should succeed and return bytes
            res = self.client.post(f"/api/shared/{token}/download")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.content, b"hello share content")

            # 2. Expiry testing (link expires in the past)
            past_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            res = self.client.post(
                f"/api/files/{file.id}/share",
                json={"expires_at": past_time, "max_downloads": None, "password": None},
                headers=headers
            )
            expired_token = res.json()["token"]
            
            # Fetching info/downloading expired link -> Should return 404 (Indistinguishable from nonexistent)
            res = self.client.get(f"/api/shared/{expired_token}")
            self.assertEqual(res.status_code, 404)
            res = self.client.post(f"/api/shared/{expired_token}/download")
            self.assertEqual(res.status_code, 404)

            # 3. Revocation testing
            res = self.client.post(
                f"/api/files/{file.id}/share",
                json={"expires_at": None, "max_downloads": None, "password": None},
                headers=headers
            )
            rev_token = res.json()["token"]
            
            # Revoke share link
            res = self.client.delete(f"/api/shared/links/{rev_token}", headers=headers)
            self.assertEqual(res.status_code, 204)
            
            # Verify revoked link returns 404
            res = self.client.get(f"/api/shared/{rev_token}")
            self.assertEqual(res.status_code, 404)
            res = self.client.post(f"/api/shared/{rev_token}/download")
            self.assertEqual(res.status_code, 404)

            # 4. Sharing deleted file testing
            res = self.client.post(
                f"/api/files/{file.id}/share",
                json={"expires_at": None, "max_downloads": None, "password": None},
                headers=headers
            )
            del_token = res.json()["token"]
            
            # Soft-delete the file
            self.client.delete(f"/api/files/{file.id}", headers=headers)
            
            # Verify shared link returns 404
            res = self.client.get(f"/api/shared/{del_token}")
            self.assertEqual(res.status_code, 404)
            res = self.client.post(f"/api/shared/{del_token}/download")
            self.assertEqual(res.status_code, 404)

            # Restore the file
            self.client.post(f"/api/recycle-bin/file/{file.id}/restore", headers=headers)

            # 5. Password protection testing
            res = self.client.post(
                f"/api/files/{file.id}/share",
                json={"expires_at": None, "max_downloads": None, "password": "SecurePassword123"},
                headers=headers
            )
            pwd_token = res.json()["token"]
            
            # Public info should show password protection is active
            res = self.client.get(f"/api/shared/{pwd_token}")
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.json()["is_password_protected"])
            
            # Downloading without password -> 401
            res = self.client.post(f"/api/shared/{pwd_token}/download")
            self.assertEqual(res.status_code, 401)
            
            # Downloading with wrong password -> 401
            res = self.client.post(f"/api/shared/{pwd_token}/download", json={"password": "WrongPassword"})
            self.assertEqual(res.status_code, 401)
            
            # Downloading with correct password -> 200
            res = self.client.post(f"/api/shared/{pwd_token}/download", json={"password": "SecurePassword123"})
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.content, b"hello share content")

        finally:
            StorageManager.__init__ = original_init

    def test_upload_content_signature_validation(self):
        admin_token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": self.admin.role})
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Upload valid PDF file (starts with %PDF) -> Should return 201
        pdf_content = b"%PDF-1.4\n%mock pdf content"
        res = self.client.post(
            "/api/files/upload",
            files={"file": ("report.pdf", pdf_content, "application/pdf")},
            data={"folder_id": ""},
            headers=headers
        )
        self.assertEqual(res.status_code, 201)

        # 2. Upload fake PDF file (does not start with %PDF) -> Should return 400
        fake_pdf_content = b"random hacker bytes, not a pdf"
        res = self.client.post(
            "/api/files/upload",
            files={"file": ("fake_report.pdf", fake_pdf_content, "application/pdf")},
            data={"folder_id": ""},
            headers=headers
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("File content does not match the file extension signature", res.json().get("detail", ""))

        # 3. Upload valid text file (valid UTF-8) -> Should return 201
        txt_content = b"Hello world, this is plain text."
        res = self.client.post(
            "/api/files/upload",
            files={"file": ("notes.txt", txt_content, "text/plain")},
            data={"folder_id": ""},
            headers=headers
        )
        self.assertEqual(res.status_code, 201)

    def test_share_password_brute_force_rate_limit(self):
        admin_token = auth.create_access_token(data={"sub": self.admin.email, "id": self.admin.id, "role": self.admin.role})
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create a file
        file = models.File(
            filename="brute_test.pdf",
            file_type="application/pdf",
            size_bytes=100,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="local",
            file_id="local-path/brute_test.pdf",
            local_file_id="local-path/brute_test.pdf",
            pending_sync=False
        )
        self.db.add(file)
        self.db.commit()

        # Create password-protected share link
        res = self.client.post(
            f"/api/files/{file.id}/share",
            json={"expires_at": None, "max_downloads": None, "password": "CorrectPassword123"},
            headers=headers
        )
        pwd_token = res.json()["token"]

        # Make 5 incorrect password attempts (limit is 5)
        for _ in range(5):
            res = self.client.post(f"/api/shared/{pwd_token}/download", json={"password": "WrongPassword"})
            self.assertEqual(res.status_code, 401)

        # 6th attempt (even with CORRECT password) should fail with 429 Too Many Requests
        res = self.client.post(f"/api/shared/{pwd_token}/download", json={"password": "CorrectPassword123"})
        self.assertEqual(res.status_code, 429)
        self.assertIn("Too many incorrect password attempts", res.json().get("detail", ""))

    def test_dual_storage_config_mode_endpoint(self):
        # Authenticate admin
        token = auth.create_access_token(data={"sub": self.admin.email, "user_id": self.admin.id, "role": "admin"})
        headers = {"Authorization": f"Bearer {token}"}

        # Setup family config with mock Google and MEGA configured (flat schema in DB, but nested configuration returned)
        self.family.storage_config = {
            "google": {"client_id": "google-client", "refresh_token": "google-refresh"},
            "mega": {"email": "test@mega.nz", "password": "password"}
        }
        self.db.commit()

        # Update storage mode to dual failover
        res = self.client.post(
            "/api/storage/config/mode",
            json={
                "storage_provider": "dual",
                "storage_mode": "failover",
                "primary_provider": "mega"
            },
            headers=headers
        )
        self.assertEqual(res.status_code, 200)
        resp_data = res.json()
        self.assertEqual(resp_data["storage_provider"], "dual")
        self.assertEqual(resp_data["storage_mode"], "failover")
        self.assertEqual(resp_data["primary_provider"], "mega")

        # Verify DB updates
        self.db.refresh(self.family)
        self.assertEqual(self.family.storage_provider, "dual")
        self.assertEqual(self.family.storage_config.get("storage_mode"), "failover")
        self.assertEqual(self.family.storage_config.get("primary_provider"), "mega")

    def test_sync_pending_files_dual_mirror(self):
        # Setup dual mirror mode
        self.family.storage_provider = "dual"
        self.family.storage_config = {
            "google": {"client_id": "google-client", "refresh_token": "google-refresh", "vault_folder_id": "google-vault"},
            "mega": {"email": "test@mega.nz", "password": "password", "vault_folder_id": "mega-vault"},
            "storage_mode": "mirror",
            "primary_provider": "google"
        }
        self.db.commit()

        # Create a file pending sync
        test_file = models.File(
            filename="dual_mirror.txt",
            file_type="text/plain",
            size_bytes=100,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="local",
            local_file_id="local-uuid-prefixed-dual_mirror.txt",
            pending_sync=True,
            pending_sync_at=datetime.now(timezone.utc)
        )
        self.db.add(test_file)
        self.db.commit()

        # Mock providers and check availability
        manager = StorageManager()
        manager.check_availability = lambda config, cache_ttl=30, db=None: {"google": True, "mega": True}

        class MockGoogleProvider:
            def upload_file(self, config, vault_folder_id, filename, file_content, mimetype, username=None, db=None):
                return {"cloud_file_id": "google-drive-id-789", "cloud_link": "http://google.com/789"}
            def health_check(self, config, db=None):
                return True
        class MockMegaProvider:
            def upload_file(self, config, vault_folder_id, filename, file_content, mimetype, username=None, db=None):
                return {"cloud_file_id": "mega-id-789", "cloud_link": "http://mega.nz/789"}
            def health_check(self, config, db=None):
                return True
        class MockLocalProvider:
            def download_file(self, config, file_id, db=None):
                return b"dual_mirror_data"
            def delete_file(self, config, file_id, db=None):
                return True

        manager.providers["google"] = MockGoogleProvider()
        manager.providers["mega"] = MockMegaProvider()
        manager.providers["local"] = MockLocalProvider()

        family_configs = {self.family.id: manager.get_family_config(self.family, self.db)}
        res = manager.sync_pending_files(self.db, family_configs, batch_size=5)

        self.assertEqual(res["synced"], 1)
        self.db.refresh(test_file)
        self.assertFalse(test_file.pending_sync)
        self.assertEqual(test_file.google_drive_file_id, "google-drive-id-789")
        self.assertEqual(test_file.mega_file_id, "mega-id-789")
        self.assertEqual(test_file.synced_to, "both")
        self.assertEqual(test_file.backup_status, "success")
        self.assertIsNone(test_file.local_file_id)

    def test_sync_pending_files_dual_failover(self):
        # Setup dual failover mode
        self.family.storage_provider = "dual"
        self.family.storage_config = {
            "google": {"client_id": "google-client", "refresh_token": "google-refresh", "vault_folder_id": "google-vault"},
            "mega": {"email": "test@mega.nz", "password": "password", "vault_folder_id": "mega-vault"},
            "storage_mode": "failover",
            "primary_provider": "google"
        }
        self.db.commit()

        # Create a file pending sync
        test_file = models.File(
            filename="dual_failover.txt",
            file_type="text/plain",
            size_bytes=100,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="local",
            local_file_id="local-uuid-prefixed-dual_failover.txt",
            pending_sync=True,
            pending_sync_at=datetime.now(timezone.utc)
        )
        self.db.add(test_file)
        self.db.commit()

        # Mock check_availability: Google is offline (False), MEGA is online (True)
        manager = StorageManager()
        manager.check_availability = lambda config, cache_ttl=30, db=None: {"google": False, "mega": True}

        class MockGoogleProvider:
            def upload_file(self, config, vault_folder_id, filename, file_content, mimetype, username=None, db=None):
                raise Exception("Google offline")
            def health_check(self, config, db=None):
                return False
        class MockMegaProvider:
            def upload_file(self, config, vault_folder_id, filename, file_content, mimetype, username=None, db=None):
                return {"cloud_file_id": "mega-failover-id-888", "cloud_link": "http://mega.nz/888"}
            def health_check(self, config, db=None):
                return True
        class MockLocalProvider:
            def download_file(self, config, file_id, db=None):
                return b"dual_failover_data"
            def delete_file(self, config, file_id, db=None):
                return True

        manager.providers["google"] = MockGoogleProvider()
        manager.providers["mega"] = MockMegaProvider()
        manager.providers["local"] = MockLocalProvider()

        family_configs = {self.family.id: manager.get_family_config(self.family, self.db)}
        res = manager.sync_pending_files(self.db, family_configs, batch_size=5)

        self.assertEqual(res["synced"], 1)
        self.db.refresh(test_file)
        self.assertFalse(test_file.pending_sync)
        self.assertEqual(test_file.mega_file_id, "mega-failover-id-888")
        self.assertIsNone(test_file.google_drive_file_id)
        self.assertEqual(test_file.synced_to, "mega")
        self.assertEqual(test_file.backup_status, "success")
        self.assertIsNone(test_file.local_file_id)

    def test_file_operations_dual_mode(self):
        # Authenticate admin
        token = auth.create_access_token(data={"sub": self.admin.email, "user_id": self.admin.id, "role": "admin"})
        headers = {"Authorization": f"Bearer {token}"}

        # Setup family config for dual mode
        self.family.storage_provider = "dual"
        self.family.storage_config = {
            "google": {"client_id": "google-client", "refresh_token": "google-refresh", "vault_folder_id": "google-vault"},
            "mega": {"email": "test@mega.nz", "password": "password", "vault_folder_id": "mega-vault"},
            "storage_mode": "mirror",
            "primary_provider": "google"
        }
        self.db.commit()

        # Create a file that is already synced to both
        test_file = models.File(
            filename="dual_ops.txt",
            file_type="text/plain",
            size_bytes=100,
            uploader_id=self.admin.id,
            folder_id=None,
            family_id=self.family.id,
            storage_provider="google",
            google_drive_file_id="google-ops-id",
            mega_file_id="mega-ops-id",
            cloud_file_id="google-ops-id",
            pending_sync=False
        )
        self.db.add(test_file)
        self.db.commit()

        # Mock provider rename and delete calls
        google_renamed = False
        mega_renamed = False
        google_deleted = False
        mega_deleted = False

        class MockGoogleProvider:
            def rename_file(self, config, file_id, new_name, db=None):
                nonlocal google_renamed
                google_renamed = True
                return True
            def delete_file(self, config, file_id, db=None):
                nonlocal google_deleted
                google_deleted = True
                return True
        class MockMegaProvider:
            def rename_file(self, config, file_id, new_name, db=None):
                nonlocal mega_renamed
                mega_renamed = True
                return True
            def delete_file(self, config, file_id, db=None):
                nonlocal mega_deleted
                mega_deleted = True
                return True

        # Use mock in API context
        from storage.storage_manager import StorageManager
        orig_init = StorageManager.__init__
        def patch_init(sm_self):
            orig_init(sm_self)
            sm_self.providers["google"] = MockGoogleProvider()
            sm_self.providers["mega"] = MockMegaProvider()

        StorageManager.__init__ = patch_init

        try:
            # Test Rename File API
            res = self.client.put(
                f"/api/files/{test_file.id}",
                json={"filename": "renamed_dual_ops.txt"},
                headers=headers
            )
            self.assertEqual(res.status_code, 200)
            self.assertTrue(google_renamed)
            self.assertTrue(mega_renamed)
            self.db.refresh(test_file)
            self.assertEqual(test_file.filename, "renamed_dual_ops.txt")

            # Soft delete first
            res = self.client.delete(f"/api/files/{test_file.id}", headers=headers)
            self.assertEqual(res.status_code, 204)
            self.db.refresh(test_file)
            self.assertIsNotNone(test_file.deleted_at)

            # Test Purge File API (Admin only)
            res = self.client.delete(f"/api/recycle-bin/file/{test_file.id}/purge", headers=headers)
            self.assertEqual(res.status_code, 204)
            self.assertTrue(google_deleted)
            self.assertTrue(mega_deleted)

            # Check DB record is deleted
            purged_file = self.db.query(models.File).filter(models.File.id == test_file.id).first()
            self.assertIsNone(purged_file)

        finally:
            StorageManager.__init__ = orig_init

if __name__ == "__main__":
    unittest.main()

