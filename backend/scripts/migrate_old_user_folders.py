import os
import sys

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
import models
from storage import get_storage_provider
from storage.storage_manager import StorageManager

def migrate():
    db = SessionLocal()
    try:
        # Fetch all families
        families = db.query(models.Family).all()
        manager = StorageManager()
        
        for family in families:
            if family.storage_provider != "google":
                continue
                
            print(f"Checking Google Drive migration for family: {family.name} (ID: {family.id})")
            provider = get_storage_provider("google")
            config = manager.get_family_config(family, db)
            drive_config = config.get("google", {})
            
            # Authenticate Drive service
            service = provider._get_client(drive_config, db)
            
            # List all subfolders under family vault root
            vault_root = family.vault_folder_id
            if not vault_root:
                print(f"Skipping family {family.name}: no vault_folder_id configured.")
                continue
                
            # Query all folders inside the vault root
            query = f"mimeType = 'application/vnd.google-apps.folder' and '{vault_root}' in parents and trashed = false"
            results = service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)',
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            subfolders = results.get('files', [])
            
            # Get usernames of family members to identify user folders
            memberships = db.query(models.FamilyMember).filter(models.FamilyMember.family_id == family.id).all()
            user_ids = [m.user_id for m in memberships]
            members = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
            usernames = {m.username for m in members}
            
            for subfolder in subfolders:
                folder_name = subfolder['name']
                folder_id = subfolder['id']
                
                # Check if this folder name matches a member's username
                if folder_name in usernames:
                    print(f"  Found username folder: '{folder_name}' (ID: {folder_id})")
                    
                    # List all files inside this username folder
                    file_query = f"'{folder_id}' in parents and trashed = false"
                    file_results = service.files().list(
                        q=file_query,
                        spaces='drive',
                        fields='files(id, name)',
                        supportsAllDrives=True,
                        includeItemsFromAllDrives=True
                    ).execute()
                    
                    for f in file_results.get('files', []):
                        file_name = f['name']
                        file_id = f['id']
                        print(f"    Moving file: '{file_name}' (ID: {file_id}) to family root...")
                        
                        # Move file: remove username folder from parents, add family root
                        file_metadata = service.files().get(fileId=file_id, fields='parents', supportsAllDrives=True).execute()
                        previous_parents = ",".join(file_metadata.get('parents', []))
                        
                        service.files().update(
                            fileId=file_id,
                            addParents=vault_root,
                            removeParents=previous_parents,
                            fields='id, parents',
                            supportsAllDrives=True
                        ).execute()
                        
                        print(f"    Successfully moved '{file_name}' in Google Drive.")
                        
                    # Delete the empty username folder
                    print(f"  Deleting empty username folder: '{folder_name}'...")
                    service.files().delete(fileId=folder_id, supportsAllDrives=True).execute()
                    print(f"  Successfully deleted folder '{folder_name}'.")
                    
        print("Migration complete!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
