import os
import tempfile
import glob

def clean():
    temp_dir = tempfile.gettempdir()
    pattern = os.path.join(temp_dir, "mega_session_*.json")
    files = glob.glob(pattern)
    print(f"Searching in temp dir: {temp_dir}")
    print(f"Found cached session files: {files}")
    for file in files:
        try:
            os.remove(file)
            print(f"Deleted cache file: {file}")
        except Exception as e:
            print(f"Error deleting cache file {file}: {str(e)}")

if __name__ == "__main__":
    clean()
