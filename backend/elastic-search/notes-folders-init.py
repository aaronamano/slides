from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os

load_dotenv()

client = Elasticsearch(
    str(os.getenv('ELASTICSEARCH_URL')),
    api_key=str(os.getenv('ELASTICSEARCH_API_KEY'))
)

notes_index = "notes-index"
folders_index = "folders-index"

notes_mappings = {
    "properties": {
        "notes": { "type": "text" },
        "folder_id": { "type": "keyword" },
        "created_at": { "type": "date" },
        "updated_at": { "type": "date" }
    }
}

folders_mappings = {
    "properties": {
        "folder_name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
        "created_at": { "type": "date" },
        "updated_at": { "type": "date" }
    }
}

def init_notes_index():
    if not client.indices.exists(index=notes_index):
        client.indices.create(index=notes_index)
        client.indices.put_mapping(index=notes_index, body=notes_mappings)
        print(f"Created index: {notes_index}")
    else:
        print(f"Index {notes_index} already exists")

def init_folders_index():
    if not client.indices.exists(index=folders_index):
        client.indices.create(index=folders_index)
        client.indices.put_mapping(index=folders_index, body=folders_mappings)
        print(f"Created index: {folders_index}")
    else:
        print(f"Index {folders_index} already exists")

if __name__ == "__main__":
    init_notes_index()
    init_folders_index()
    print("Notes and Folders indices initialized successfully!")
