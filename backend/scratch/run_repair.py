import os
import sys
import uuid
import tempfile
import shutil
from datetime import datetime, timezone

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from storage.mega_provider import MegaProvider
from config import MEGA_EMAIL, MEGA_PASSWORD

def repair():
    db = SessionLocal()
    try:
        family_id = "ljbj72ie05nl"
        family = db.query(models.Family).filter(models.Family.id == family_id).first()
        if not family:
            print(f"Error: Family {family_id} not found in database!")
            return
            
        print(f"Repairing storage for family: {family.name} (ID: {family.id})")
        
        provider = MegaProvider()
        config = {"email": MEGA_EMAIL, "password": MEGA_PASSWORD}
        
        print(f"Logging in to MEGA as {MEGA_EMAIL}...")
        client = provider._get_client(config)
        
        print("Fetching files/folders from MEGA...")
        files_in_mega = client.get_files()
        print(f"Total items found in MEGA: {len(files_in_mega)}")
        
        vault_folder_id = "FAllUISI"  # Known correct vault ID from check_mega.py
        if vault_folder_id not in files_in_mega:
            print(f"Vault folder {vault_folder_id} not found in MEGA list. Falling back to ensure_vault_folder...")
            vault_folder_id = provider.ensure_vault_folder(family.id, config, db=db)
        else:
            print(f"Verified vault folder '{vault_folder_id}' exists in MEGA.")
            
        # Update family vault_folder_id in DB
        if family.vault_folder_id != vault_folder_id:
            print(f"Updating family vault_folder_id from '{family.vault_folder_id}' to '{vault_folder_id}'")
            family.vault_folder_id = vault_folder_id
            db.commit()
            
        # 2. Check and align folder 5 (Akshay)
        print("\n2. Aligning Folder 5 (Akshay)...")
        folder_5 = db.query(models.Folder).filter(models.Folder.id == 5).first()
        if folder_5:
            cloud_folder_id_5 = "VMtATDya"
            folder_info_5 = files_in_mega.get(cloud_folder_id_5)
            if folder_info_5:
                current_parent_5 = folder_info_5.get("p")
                if current_parent_5 != vault_folder_id:
                    print(f"Moving folder 'Akshay' ({cloud_folder_id_5}) under parent '{vault_folder_id}' in MEGA...")
                    client.move(cloud_folder_id_5, vault_folder_id)
                else:
                    print(f"Folder 'Akshay' ({cloud_folder_id_5}) is already under correct parent '{vault_folder_id}'.")
            else:
                print(f"Warning: Folder node '{cloud_folder_id_5}' not found in MEGA!")
                
            if folder_5.cloud_folder_id != cloud_folder_id_5:
                print(f"Updating folder 5 cloud_folder_id in DB to '{cloud_folder_id_5}'")
                folder_5.cloud_folder_id = cloud_folder_id_5
                db.commit()
        else:
            print("Folder 5 not found in DB!")
            
        # 3. Check and align folder 7 (abhay)
        print("\n3. Aligning Folder 7 (abhay)...")
        folder_7 = db.query(models.Folder).filter(models.Folder.id == 7).first()
        if folder_7:
            cloud_folder_id_7 = "dYM3QbST"
            folder_info_7 = files_in_mega.get(cloud_folder_id_7)
            if folder_info_7:
                current_parent_7 = folder_info_7.get("p")
                if current_parent_7 != vault_folder_id:
                    print(f"Moving folder 'abhay' ({cloud_folder_id_7}) under parent '{vault_folder_id}' in MEGA...")
                    client.move(cloud_folder_id_7, vault_folder_id)
                else:
                    print(f"Folder 'abhay' ({cloud_folder_id_7}) is already under correct parent '{vault_folder_id}'.")
            else:
                print(f"Warning: Folder node '{cloud_folder_id_7}' not found in MEGA!")
                
            if folder_7.cloud_folder_id != cloud_folder_id_7:
                print(f"Updating folder 7 cloud_folder_id in DB to '{cloud_folder_id_7}'")
                folder_7.cloud_folder_id = cloud_folder_id_7
                db.commit()
        else:
            print("Folder 7 not found in DB!")
            
        # 4. Check and reset sync status for Resume.jpg (ID: 143)
        print("\n4. Resetting sync status for Resume.jpg...")
        resume_file = db.query(models.File).filter(models.File.id == 143).first()
        if resume_file:
            # Check if local file exists
            local_exists = False
            if resume_file.local_file_id:
                local_path = os.path.join("local_vault", resume_file.family_id, resume_file.local_file_id)
                local_exists = os.path.exists(local_path)
                
            if not local_exists:
                print("Local file for Resume.jpg not found. Attempting to download from MEGA first...")
                # Download from existing cloud_file_id or from rubbish bin node
                download_node = resume_file.cloud_file_id or "xRUFVDoS"
                if download_node not in files_in_mega:
                    # Search MEGA for any file named Resume.jpg to download from
                    for nid, info in files_in_mega.items():
                        if info.get("t") == 0 and info.get("a", {}).get("n") == "Resume.jpg":
                            download_node = nid
                            break
                            
                print(f"Downloading Resume.jpg content from MEGA node: {download_node}...")
                try:
                    temp_dir = tempfile.mkdtemp()
                    try:
                        node_info = files_in_mega[download_node]
                        client.download((download_node, node_info), temp_dir)
                        
                        dir_files = os.listdir(temp_dir)
                        if dir_files:
                            downloaded_path = os.path.join(temp_dir, dir_files[0])
                            
                            local_vault_dir = os.path.join("local_vault", resume_file.family_id)
                            os.makedirs(local_vault_dir, exist_ok=True)
                            
                            new_local_filename = f"{uuid.uuid4()}_Resume.jpg"
                            local_path = os.path.join(local_vault_dir, new_local_filename)
                            
                            shutil.copy2(downloaded_path, local_path)
                            resume_file.local_file_id = new_local_filename
                            db.commit()
                            print(f"Successfully saved Resume.jpg locally to: {local_path} and set local_file_id in DB.")
                        else:
                            raise Exception("Download directory was empty after client.download")
                    finally:
                        shutil.rmtree(temp_dir, ignore_errors=True)
                except Exception as dl_err:
                    print(f"Error downloading Resume.jpg: {str(dl_err)}")
            
            # Clean up all duplicate copies from MEGA to prevent clutter
            print("Cleaning duplicate copies from MEGA...")
            duplicates = ["xRUFVDoS", "8Q9xhIYI", "oYkRzSCB"]
            for dup_node in duplicates:
                if dup_node in files_in_mega:
                    try:
                        print(f"Deleting duplicate node {dup_node} from MEGA directly...")
                        node_info = files_in_mega[dup_node]
                        client.destroy((dup_node, node_info))
                        print(f"Successfully deleted duplicate node {dup_node}.")
                    except Exception as del_err:
                        print(f"Could not delete duplicate node {dup_node}: {str(del_err)}")
            
            # Reset sync flags
            print("Resetting sync status flags in DB...")
            resume_file.cloud_file_id = None
            resume_file.synced_to = None
            resume_file.pending_sync = True
            resume_file.pending_sync_at = datetime.now(timezone.utc)
            db.commit()
            print("Resume.jpg is now flagged for clean re-sync.")
        else:
            print("Resume.jpg (ID 143) not found in DB!")
            
        # 5. Fix missing cloud_file_id fields for other files in the database
        print("\n5. Backfilling missing cloud_file_id columns for other files...")
        other_files = db.query(models.File).filter(
            models.File.storage_provider == "mega",
            models.File.cloud_file_id == None
        ).all()
        
        updated_count = 0
        for f in other_files:
            if f._file_id:
                print(f"Backfilling file '{f.filename}' (ID: {f.id}) with cloud_file_id = '{f._file_id}'")
                f.cloud_file_id = f._file_id
                updated_count += 1
        if updated_count > 0:
            db.commit()
            print(f"Backfilled {updated_count} files.")
        else:
            print("No other files with missing cloud_file_id found.")
            
        print("\nRepair completed successfully!")
        
    finally:
        db.close()

if __name__ == "__main__":
    repair()
