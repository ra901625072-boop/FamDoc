import os
from mega import Mega
import json

def save_session(client, filepath):
    with open(filepath, "w") as f:
        json.dump({
            "sid": client.sid,
            "master_key": list(client.master_key),
            "sequence_num": client.sequence_num,
            "trash_node": client._trash_folder_node_id
        }, f)

def load_session(filepath):
    with open(filepath, "r") as f:
        data = json.load(f)
    client = Mega()
    client.sid = data["sid"]
    client.master_key = tuple(data["master_key"]) # master_key is typically a tuple of ints
    client.sequence_num = data["sequence_num"]
    client._trash_folder_node_id = data["trash_node"]
    return client

if __name__ == "__main__":
    print("Test ready")
