import os
import sys

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

def inspect_details():
    db = SessionLocal()
    try:
        file_rec = db.query(models.File).filter(models.File.id == 133).first()
        if file_rec:
            print("--- File 133 Details ---")
            print(f"ID: {file_rec.id}")
            print(f"Filename: {file_rec.filename}")
            print(f"StorageProvider: {file_rec.storage_provider}")
            print(f"LocalFileID: {file_rec.local_file_id}")
            print(f"CloudFileID: {file_rec.cloud_file_id}")
            print(f"Legacy FileID: {file_rec._file_id}")
            print(f"PendingSync: {file_rec.pending_sync}")
            print(f"SyncedTo: {file_rec.synced_to}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_details()
