import os
import sys

def find_file():
    root_dir = "d:\\FDMS"
    for r, d, f in os.walk(root_dir):
        for file in f:
            if "resume" in file.lower():
                print(os.path.join(r, file))

if __name__ == "__main__":
    find_file()
