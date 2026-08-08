import os
import sys

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

def inspect():
    db = SessionLocal()
    try:
        print("--- FAMILIES ---")
        families = db.query(models.Family).all()
        for f in families:
            print(f"ID: {f.id}, Name: {f.name}, AdminID: {f.admin_id}, VaultFolderID: {f.vault_folder_id}, StorageProvider: {f.storage_provider}")
            
        print("\n--- FOLDERS ---")
        folders = db.query(models.Folder).all()
        for folder in folders:
            print(f"ID: {folder.id}, Name: {folder.name}, ParentID: {folder.parent_id}, FamilyID: {folder.family_id}, CloudFolderID: {folder.cloud_folder_id}")
            
        print("\n--- FILES ---")
        files = db.query(models.File).all()
        for file in files:
            print(f"ID: {file.id}, Filename: {file.filename}, FolderID: {file.folder_id}, FamilyID: {file.family_id}, StorageProvider: {file.storage_provider}, CloudFileID: {file.cloud_file_id}, PendingSync: {file.pending_sync}, SyncedTo: {file.synced_to}")
            
    finally:
        db.close()

if __name__ == "__main__":
    inspect()
