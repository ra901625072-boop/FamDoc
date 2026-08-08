import os
import sys

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

def inspect_details():
    db = SessionLocal()
    try:
        file_rec = db.query(models.File).filter(models.File.id == 143).first()
        if file_rec:
            print("--- File 143 Details ---")
            print(f"ID: {file_rec.id}")
            print(f"Filename: {file_rec.filename}")
            print(f"FolderID: {file_rec.folder_id}")
            print(f"FamilyID: {file_rec.family_id}")
            print(f"StorageProvider: {file_rec.storage_provider}")
            print(f"LocalFileID: {file_rec.local_file_id}")
            print(f"CloudFileID: {file_rec.cloud_file_id}")
            print(f"Legacy FileID: {file_rec._file_id}")
            print(f"PendingSync: {file_rec.pending_sync}")
            print(f"SyncedTo: {file_rec.synced_to}")
            print(f"CloudLink: {file_rec.cloud_link}")
            
            # Check local file existence
            local_path = os.path.join("local_vault", file_rec.family_id, file_rec.local_file_id)
            print(f"Checking local path: {local_path}")
            if os.path.exists(local_path):
                print(f"Local file exists. Size: {os.path.getsize(local_path)} bytes")
            else:
                print("Local file does NOT exist!")
        else:
            print("File 143 not found!")
            
        # Check folders
        print("\n--- Folder 5 Details ---")
        f5 = db.query(models.Folder).filter(models.Folder.id == 5).first()
        if f5:
            print(f"ID: {f5.id}, Name: {f5.name}, CloudFolderID: {f5.cloud_folder_id}")
        else:
            print("Folder 5 not found!")
            
        print("\n--- Folder 7 Details ---")
        f7 = db.query(models.Folder).filter(models.Folder.id == 7).first()
        if f7:
            print(f"ID: {f7.id}, Name: {f7.name}, CloudFolderID: {f7.cloud_folder_id}")
        else:
            print("Folder 7 not found!")
            
    finally:
        db.close()

if __name__ == "__main__":
    inspect_details()
