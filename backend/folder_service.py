from typing import List, Optional
from pydantic import BaseModel
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

client = Elasticsearch(
    str(os.getenv('ELASTICSEARCH_URL')),
    api_key=str(os.getenv('ELASTICSEARCH_API_KEY'))
)

folders_index = "folders-index"


class FolderCreate(BaseModel):
    folder_name: str


class FolderUpdate(BaseModel):
    folder_name: Optional[str] = None


class FolderResponse(BaseModel):
    id: str
    folder_name: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class FolderService:
    def __init__(self):
        pass

    def create_folder(self, folder: FolderCreate) -> FolderResponse:
        try:
            now = datetime.utcnow().isoformat()
            doc = {
                "folder_name": folder.folder_name,
                "created_at": now,
                "updated_at": now
            }

            response = client.index(index=folders_index, body=doc)
            doc["id"] = response["_id"]
            return FolderResponse(**doc)
        except Exception as e:
            raise Exception(f"Error creating folder: {str(e)}")

    def get_all_folders(self) -> List[FolderResponse]:
        try:
            response = client.search(index=folders_index, body={"query": {"match_all": {}}})
            folders = []
            for hit in response["hits"]["hits"]:
                folder_data = hit["_source"]
                folder_data["id"] = hit["_id"]
                folders.append(FolderResponse(**folder_data))
            return folders
        except Exception as e:
            raise Exception(f"Error fetching folders: {str(e)}")

    def get_folder_by_id(self, folder_id: str) -> Optional[FolderResponse]:
        try:
            response = client.get(index=folders_index, id=folder_id)
            if response["found"]:
                folder_data = response["_source"]
                folder_data["id"] = response["_id"]
                return FolderResponse(**folder_data)
            return None
        except Exception as e:
            return None

    def update_folder(self, folder_id: str, folder_update: FolderUpdate) -> Optional[FolderResponse]:
        try:
            existing = self.get_folder_by_id(folder_id)
            if not existing:
                return None

            update_data = {"updated_at": datetime.utcnow().isoformat()}

            if folder_update.folder_name:
                update_data["folder_name"] = folder_update.folder_name

            client.update(index=folders_index, id=folder_id, body={"doc": update_data})
            return self.get_folder_by_id(folder_id)
        except Exception as e:
            raise Exception(f"Error updating folder: {str(e)}")

    def delete_folder(self, folder_id: str) -> bool:
        try:
            response = client.delete(index=folders_index, id=folder_id)
            return response.get("result") in ["deleted", "not_found"]
        except Exception as e:
            return False
