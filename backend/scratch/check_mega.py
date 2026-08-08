import os
import sys

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage.mega_provider import MegaProvider
from config import MEGA_EMAIL, MEGA_PASSWORD

def check_mega():
    print(f"Logging in to MEGA as {MEGA_EMAIL}...")
    provider = MegaProvider()
    config = {"email": MEGA_EMAIL, "password": MEGA_PASSWORD}
    client = provider._get_client(config)
    
    print("Fetching files/folders from MEGA...")
    files = client.get_files()
    
    print(f"Total items found: {len(files)}")
    print("\nListing all folder nodes (type = 1):")
    for nid, file_info in files.items():
        if file_info.get("t") == 1:
            name = file_info.get("a", {}).get("n")
            parent = file_info.get("p")
            print(f"Folder Name: {name}, Node ID: {nid}, Parent Node ID: {parent}")
            
    print("\nListing all files (type = 0) named Resume.jpg or similar:")
    for nid, file_info in files.items():
        if file_info.get("t") == 0:
            name = file_info.get("a", {}).get("n")
            if "resume" in name.lower() or "pdf" in name.lower():
                parent = file_info.get("p")
                print(f"File Name: {name}, Node ID: {nid}, Parent Node ID: {parent}")

if __name__ == "__main__":
    check_mega()
