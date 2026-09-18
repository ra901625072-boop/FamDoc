import os
import sys
import unittest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

# Adjust python path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
import models
import auth
from storage.storage_manager import StorageManager

from tests.test_redesign import engine, TestingSessionLocal

class TestMultiDriveAlgorithm(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        pass

    def setUp(self):
        self.db = TestingSessionLocal()
        self.db.query(models.File).delete()
        self.db.query(models.Folder).delete()
        self.db.query(models.StorageAccount).delete()
        self.db.query(models.FamilyMember).delete()
        self.db.query(models.Family).delete()
        self.db.query(models.User).delete()
        self.db.commit()

        # Admin user & family
        self.admin = models.User(
            username="admin_user",
            email="admin@test.com",
            password_hash=auth.get_password_hash("Password123"),
            role="admin"
        )
        self.db.add(self.admin)
        self.db.flush()

        self.family = models.Family(
            id="fam_multidrive_1",
            name="MultiDrive Family",
            admin_id=self.admin.id,
            secret_code_hash="hashed_code",
            max_members=10,
            storage_quota_bytes=15 * 1024 * 1024 * 1024,
            storage_provider="google",
            vault_folder_id="root-vault-drive1"
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

    def test_scenario_1_single_2gb_file_exceeds_individual_drives(self):
        """
        Scenario 1:
        Total storage is 10 GB across 2 drives (5 GB each).
        Drive 1 has 4 GB used (1 GB free).
        Drive 2 has 4 GB used (1 GB free).
        Total free space = 2 GB.
        User uploads a single 2 GB file.
        Expectation:
        - select_target_account returns None (cannot split single file across Google Drives).
        - Upload endpoint returns HTTP 400 Bad Request with explicit explanation.
        """
        GB = 1024 * 1024 * 1024
        acct1 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive1@test.com",
            label="Drive 1",
            status="active",
            priority=0,
            cached_quota_total=5 * GB,
            cached_quota_used=4 * GB,
            quota_checked_at=datetime.now(timezone.utc),
            vault_folder_id="vault-1"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive2@test.com",
            label="Drive 2",
            status="active",
            priority=1,
            cached_quota_total=5 * GB,
            cached_quota_used=4 * GB,
            quota_checked_at=datetime.now(timezone.utc),
            vault_folder_id="vault-2"
        )
        self.db.add_all([acct1, acct2])
        self.db.commit()

        # 1. Direct algorithm check
        target = self.manager.select_target_account(self.family, 2 * GB, self.db)
        self.assertIsNone(target, "Neither 5 GB drive has 2 GB free, so target must be None")

        # 2. Upload endpoint check with 1500 bytes when both drives only have 1000 bytes free
        acct1.cached_quota_total = 5000
        acct1.cached_quota_used = 4000  # 1000 free
        acct2.cached_quota_total = 5000
        acct2.cached_quota_used = 4000  # 1000 free
        self.family.storage_quota_bytes = 10000
        self.db.commit()

        with patch("utils.virus_scan.scan_file_for_viruses", return_value=True):
            file_payload = {"file": ("file_1500b.pdf", b"%PDF" + b"x" * 1496, "application/pdf")}
            res = self.client.post("/api/files/upload", files=file_payload, headers=self.headers)
            self.assertEqual(res.status_code, 400)
            self.assertIn("No single Google Drive account has sufficient free space", res.json().get("detail", ""))

    def test_scenario_2_multiple_files_totaling_capacity_distribute_evenly(self):
        """
        Scenario 2:
        Drive 1 has 1000 bytes free (4000/5000).
        Drive 2 has 1000 bytes free (4000/5000).
        Total free = 2000 bytes.
        Upload file 1 (800 bytes) -> stored in Drive 1.
        Drive 1 now has 200 bytes free.
        Upload file 2 (800 bytes) -> stored in Drive 2 (since Drive 1 cannot fit 800 bytes).
        """
        acct1 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive1@test.com",
            label="Drive 1",
            status="active",
            priority=0,
            cached_quota_total=5000,
            cached_quota_used=4000,
            quota_checked_at=datetime.now(timezone.utc),
            vault_folder_id="vault-1"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive2@test.com",
            label="Drive 2",
            status="active",
            priority=1,
            cached_quota_total=5000,
            cached_quota_used=4000,
            quota_checked_at=datetime.now(timezone.utc),
            vault_folder_id="vault-2"
        )
        self.db.add_all([acct1, acct2])
        self.db.commit()

        # Step 1: 800 bytes upload -> candidates are acct1 (1000 free) and acct2 (1000 free).
        # Tie-breaker: acct1 priority 0 < acct2 priority 1.
        picked_1 = self.manager.select_target_account(self.family, 800, self.db)
        self.assertEqual(picked_1.id, acct1.id)

        # Simulate upload to acct1 and quota cache update
        acct1.cached_quota_used += 800
        self.db.commit()

        # Step 2: Second 800 bytes upload -> acct1 has 200 free, acct2 has 1000 free.
        # acct1 cannot fit 800 bytes. acct2 must be picked!
        picked_2 = self.manager.select_target_account(self.family, 800, self.db)
        self.assertEqual(picked_2.id, acct2.id)

    def test_scenario_3_three_drives_picks_drive_with_most_free_space(self):
        """
        Scenario 3:
        3 drives of 5 GB each (total 15 GB):
        Drive 1: 3 GB used -> 2 GB free
        Drive 2: 2 GB used -> 3 GB free (MOST FREE)
        Drive 3: 4 GB used -> 1 GB free
        Upload 100 MB file.
        Expectation: Drive 2 is selected.
        """
        GB = 1024 * 1024 * 1024
        MB = 1024 * 1024
        acct1 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive1@test.com",
            label="Drive 1",
            status="active",
            priority=0,
            cached_quota_total=5 * GB,
            cached_quota_used=3 * GB,
            quota_checked_at=datetime.now(timezone.utc),
            vault_folder_id="vault-1"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive2@test.com",
            label="Drive 2",
            status="active",
            priority=1,
            cached_quota_total=5 * GB,
            cached_quota_used=2 * GB,
            quota_checked_at=datetime.now(timezone.utc),
            vault_folder_id="vault-2"
        )
        acct3 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive3@test.com",
            label="Drive 3",
            status="active",
            priority=2,
            cached_quota_total=5 * GB,
            cached_quota_used=4 * GB,
            quota_checked_at=datetime.now(timezone.utc),
            vault_folder_id="vault-3"
        )
        self.db.add_all([acct1, acct2, acct3])
        self.db.commit()

        # 100 MB upload
        target = self.manager.select_target_account(self.family, 100 * MB, self.db)
        self.assertEqual(target.id, acct2.id, "Drive 2 has 3 GB free space (most free), so it must be chosen")

    def test_quota_cache_fallback_when_refresh_fails(self):
        """
        When online quota refresh fails (e.g. network timeout or mock credentials),
        _get_or_refresh_free_space must safely fall back to cached_quota_total - cached_quota_used,
        never returning None (which would be treated as infinite free space).
        """
        acct = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="fallback@test.com",
            label="Fallback Drive",
            status="active",
            priority=0,
            cached_quota_total=5000,
            cached_quota_used=3500,
            quota_checked_at=None, # Trigger refresh attempt
            vault_folder_id="vault-fb"
        )
        self.db.add(acct)
        self.db.commit()

        free = self.manager._get_or_refresh_free_space(acct, self.db)
        self.assertEqual(free, 1500, "Should fall back to 5000 - 3500 = 1500 free space")

    def test_multi_drive_folder_mapping_isolation(self):
        """
        Verify that ensure_folder_for_account creates and maps separate cloud folder IDs
        for each Google Drive account, stored in Folder.account_folder_ids.
        """
        acct1 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive1@test.com",
            label="Drive 1",
            status="active",
            priority=0,
            vault_folder_id="vault-drive1"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive2@test.com",
            label="Drive 2",
            status="active",
            priority=1,
            vault_folder_id="vault-drive2"
        )
        self.db.add_all([acct1, acct2])
        self.db.commit()

        folder = models.Folder(
            name="Invoices",
            family_id=self.family.id,
            parent_id=None
        )
        self.db.add(folder)
        self.db.commit()
        self.db.refresh(folder)

        # Mock create_folder on Google provider
        mock_provider = MagicMock()
        mock_provider.find_or_create_folder.side_effect = lambda config, parent_folder_id, folder_name, db=None: f"cloud-{folder_name}-on-{config['storage_account_id']}"
        self.manager.providers["google"] = mock_provider

        # Ensure folder for acct1
        cloud_id_1 = self.manager.ensure_folder_for_account(folder.id, acct1, self.family, self.db)
        self.assertEqual(cloud_id_1, f"cloud-Invoices-on-{acct1.id}")

        # Ensure folder for acct2
        cloud_id_2 = self.manager.ensure_folder_for_account(folder.id, acct2, self.family, self.db)
        self.assertEqual(cloud_id_2, f"cloud-Invoices-on-{acct2.id}")
        self.assertNotEqual(cloud_id_1, cloud_id_2, "Each account must have its own Google Drive folder ID")

        # Verify mapping is saved in folder.account_folder_ids
        self.db.refresh(folder)
        mappings = folder.account_folder_ids
        self.assertEqual(mappings.get(str(acct1.id)), cloud_id_1)
        self.assertEqual(mappings.get(str(acct2.id)), cloud_id_2)

    def test_quota_decrement_on_file_purge(self):
        """
        When a file is permanently purged from recycle bin,
        StorageAccount.cached_quota_used must be decremented immediately.
        """
        acct = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="drive1@test.com",
            label="Drive 1",
            status="active",
            priority=0,
            cached_quota_total=10000,
            cached_quota_used=4000,
            vault_folder_id="vault-1"
        )
        self.db.add(acct)
        self.db.commit()

        file = models.File(
            filename="to_purge.pdf",
            file_type="application/pdf",
            size_bytes=1000,
            _file_id="cloud_f1",
            cloud_file_id="cloud_f1",
            family_id=self.family.id,
            uploader_id=self.admin.id,
            storage_provider="google",
            google_drive_file_id="cloud_f1",
            storage_account_id=acct.id,
            deleted_at=datetime.now(timezone.utc)
        )
        self.db.add(file)
        self.db.commit()
        self.db.refresh(file)

        # Mock google provider delete_file
        with patch.object(self.manager.providers["google"], "delete_file", return_value=True):
            res = self.client.delete(f"/api/recycle-bin/file/{file.id}/purge", headers=self.headers)
            self.assertEqual(res.status_code, 204)

        # Verify cached_quota_used is decremented
        self.db.refresh(acct)
        self.assertEqual(acct.cached_quota_used, 3000, "Purging 1000-byte file should reduce cached_quota_used from 4000 to 3000")

    def test_account_disconnect_migration_preserves_folders_and_quotas(self):
        """
        When an account is disconnecting, migrate_account_files must:
        - Route files to an active replacement account with sufficient space.
        - Ensure folder structure on the target account.
        - Increment target account cached_quota_used.
        - Decrement old account cached_quota_used.
        - Mark old account as disconnected once 0 files remain.
        """
        acct1 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="disconnecting@test.com",
            label="Old Drive",
            status="disconnecting",
            priority=0,
            cached_quota_total=5000,
            cached_quota_used=2000,
            vault_folder_id="vault-old"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="target@test.com",
            label="New Drive",
            status="active",
            priority=1,
            cached_quota_total=10000,
            cached_quota_used=1000,
            vault_folder_id="vault-new"
        )
        self.db.add_all([acct1, acct2])
        self.db.commit()

        folder = models.Folder(
            name="Finance",
            family_id=self.family.id,
            parent_id=None
        )
        self.db.add(folder)
        self.db.commit()
        self.db.refresh(folder)

        file = models.File(
            filename="report.pdf",
            file_type="application/pdf",
            size_bytes=500,
            _file_id="old_cloud_id",
            cloud_file_id="old_cloud_id",
            google_drive_file_id="old_cloud_id",
            family_id=self.family.id,
            uploader_id=self.admin.id,
            storage_provider="google",
            storage_account_id=acct1.id,
            folder_id=folder.id
        )
        self.db.add(file)
        self.db.commit()
        self.db.refresh(file)

        mock_provider = MagicMock()
        mock_provider.download_file.return_value = b"%PDF-dummy-content"
        mock_provider.upload_file.return_value = {"cloud_file_id": "new_cloud_id", "cloud_link": "https://drive.google.com/new"}
        mock_provider.find_or_create_folder.return_value = "new_folder_id"
        mock_provider.delete_file.return_value = True
        self.manager.providers["google"] = mock_provider

        # Run migration
        self.manager.migrate_account_files(acct1.id, self.db)

        # Verifications
        self.db.refresh(file)
        self.assertEqual(file.storage_account_id, acct2.id, "File must be reassigned to target account")
        self.assertEqual(file.google_drive_file_id, "new_cloud_id")

        self.db.refresh(acct2)
        self.assertEqual(acct2.cached_quota_used, 1500, "Target account quota should increase by file size (1000 -> 1500)")

        self.db.refresh(acct1)
        self.assertEqual(acct1.cached_quota_used, 1500, "Old account quota should decrease by file size (2000 -> 1500)")
        self.assertEqual(acct1.status, "disconnected", "Old account with 0 files remaining should be marked disconnected")

    def test_disconnect_migration_migrates_soft_deleted_files_and_disconnects_cleanly(self):
        """
        If an account being disconnected has both active and soft-deleted files in recycle bin,
        both must be migrated so 0 files remain and status cleanly becomes 'disconnected'.
        """
        acct1 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="disconn_recycle@test.com",
            label="Old Drive With Recycle",
            status="disconnecting",
            priority=0,
            cached_quota_total=5000,
            cached_quota_used=1200,
            vault_folder_id="vault-old-recycle"
        )
        acct2 = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="target_recycle@test.com",
            label="New Target Drive",
            status="active",
            priority=1,
            cached_quota_total=10000,
            cached_quota_used=500,
            vault_folder_id="vault-new-recycle"
        )
        self.db.add_all([acct1, acct2])
        self.db.commit()

        # 1 active file + 1 soft-deleted file
        file_active = models.File(
            filename="active.pdf",
            file_type="application/pdf",
            size_bytes=400,
            _file_id="cloud_act",
            cloud_file_id="cloud_act",
            google_drive_file_id="cloud_act",
            family_id=self.family.id,
            uploader_id=self.admin.id,
            storage_provider="google",
            storage_account_id=acct1.id
        )
        file_deleted = models.File(
            filename="in_recycle_bin.pdf",
            file_type="application/pdf",
            size_bytes=800,
            _file_id="cloud_del",
            cloud_file_id="cloud_del",
            google_drive_file_id="cloud_del",
            family_id=self.family.id,
            uploader_id=self.admin.id,
            storage_provider="google",
            storage_account_id=acct1.id,
            deleted_at=datetime.now(timezone.utc)
        )
        self.db.add_all([file_active, file_deleted])
        self.db.commit()

        mock_provider = MagicMock()
        mock_provider.download_file.return_value = b"%PDF-content"
        mock_provider.upload_file.return_value = {"cloud_file_id": "migrated_cloud_id", "cloud_link": "https://drive.google.com/mig"}
        mock_provider.find_or_create_folder.return_value = "target_folder"
        mock_provider.delete_file.return_value = True
        self.manager.providers["google"] = mock_provider

        # Run migration
        self.manager.migrate_account_files(acct1.id, self.db)

        # Both files must now belong to target account
        self.db.refresh(file_active)
        self.db.refresh(file_deleted)
        self.assertEqual(file_active.storage_account_id, acct2.id)
        self.assertEqual(file_deleted.storage_account_id, acct2.id)
        self.assertIsNotNone(file_deleted.deleted_at, "Soft-deleted status must remain preserved after migration")

        # Old account must be disconnected
        self.db.refresh(acct1)
        self.assertEqual(acct1.status, "disconnected")
        self.assertEqual(acct1.cached_quota_used, 0)

    def test_resolve_file_account_config_during_disconnecting_state(self):
        """
        When an account is in 'disconnecting' state, resolve_file_account_config must
        still return its credentials so its files can be downloaded and migrated.
        """
        acct = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="disconnecting_res@test.com",
            label="Disconnecting Drive",
            status="disconnecting",
            priority=0,
            vault_folder_id="vault-disconn"
        )
        acct.config = {
            "client_id": "cid_test",
            "client_secret": "csec_test",
            "refresh_token": "rt_test"
        }
        self.db.add(acct)
        self.db.commit()

        file = models.File(
            filename="to_download.pdf",
            file_type="application/pdf",
            size_bytes=300,
            _file_id="cloud_f_disconn",
            cloud_file_id="cloud_f_disconn",
            google_drive_file_id="cloud_f_disconn",
            family_id=self.family.id,
            uploader_id=self.admin.id,
            storage_provider="google",
            storage_account_id=acct.id
        )
        self.db.add(file)
        self.db.commit()

        cfg = self.manager.resolve_file_account_config(file, self.db)
        self.assertIsNotNone(cfg)
        self.assertEqual(cfg.get("storage_account_id"), acct.id)
        self.assertEqual(cfg.get("client_id"), "cid_test")

    def test_quota_used_none_initialization_on_upload(self):
        """
        If a drive's cached_quota_used is None (e.g. freshly connected or not yet checked),
        uploading a file must initialize it to file_size instead of leaving it None.
        """
        acct = models.StorageAccount(
            family_id=self.family.id,
            provider="google",
            email="fresh@test.com",
            label="Fresh Drive",
            status="active",
            priority=0,
            cached_quota_total=10000,
            cached_quota_used=None,  # Not yet populated
            vault_folder_id="vault-fresh"
        )
        acct.config = {
            "client_id": "test_client_id",
            "client_secret": "test_client_secret",
            "refresh_token": "test_refresh_token"
        }
        self.db.add(acct)
        self.db.commit()

        with patch("utils.virus_scan.scan_file_for_viruses", return_value=True):
            with patch("storage.google_drive_provider.GoogleDriveProvider.upload_file", return_value={"cloud_file_id": "fresh_cloud_id", "cloud_link": "https://drive.google.com/fresh"}):
                file_payload = {"file": ("fresh_upload.pdf", b"%PDF" + b"x" * 996, "application/pdf")}
                res = self.client.post("/api/files/upload", files=file_payload, headers=self.headers)
                self.assertEqual(res.status_code, 201)

        self.db.refresh(acct)
        self.assertEqual(acct.cached_quota_used, 1000, "cached_quota_used should initialize from None to 1000")


if __name__ == "__main__":
    unittest.main()

