from typing import List, Optional
from pydantic import BaseModel
from mongo_client import MongoClient

class FolderCreate(BaseModel):
    folder_name: str

class FolderUpdate(BaseModel):
    folder_name: Optional[str] = None

class FolderResponse(BaseModel):
    id: str
    folder_name: str
    
    class Config:
        from_attributes = True

class FolderService:
    def __init__(self):
        self.collection = None
    
    async def _get_collection(self):
        if self.collection is None:
            self.collection = await MongoClient.get_folders_collection()
        return self.collection
    
    async def create_folder(self, folder: FolderCreate) -> FolderResponse:
        """Create a new folder"""
        try:
            collection = await self._get_collection()
            folder_doc = {
                "folder_name": folder.folder_name
            }
            
            result = await collection.insert_one(folder_doc)
            
            inserted_doc = await collection.find_one({"_id": result.inserted_id})
            inserted_doc['id'] = str(inserted_doc['_id'])
            del inserted_doc['_id']
            
            return FolderResponse(**inserted_doc)
        except Exception as e:
            raise Exception(f"Error creating folder: {str(e)}")
    
    async def get_all_folders(self) -> List[FolderResponse]:
        """Get all folders"""
        try:
            collection = await self._get_collection()
            folders = []
            async for folder in collection.find():
                folder['id'] = str(folder['_id'])
                del folder['_id']
                folders.append(FolderResponse(**folder))
            return folders
        except Exception as e:
            raise Exception(f"Error fetching folders: {str(e)}")
    
    async def get_folder_by_id(self, folder_id: str) -> Optional[FolderResponse]:
        """Get a specific folder by ID"""
        try:
            from bson import ObjectId
            collection = await self._get_collection()
            folder = await collection.find_one({"_id": ObjectId(folder_id)})
            if folder:
                folder['id'] = str(folder['_id'])
                del folder['_id']
                return FolderResponse(**folder)
            return None
        except Exception as e:
            raise Exception(f"Error fetching folder: {str(e)}")
    
    async def update_folder(self, folder_id: str, folder_update: FolderUpdate) -> Optional[FolderResponse]:
        """Update an existing folder"""
        try:
            from bson import ObjectId
            existing = await self.get_folder_by_id(folder_id)
            if not existing:
                return None
            
            collection = await self._get_collection()
            update_data = {}
            
            if folder_update.folder_name:
                update_data["folder_name"] = folder_update.folder_name
            
            if update_data:
                await collection.update_one(
                    {"_id": ObjectId(folder_id)}, 
                    {"$set": update_data}
                )
            
            return await self.get_folder_by_id(folder_id)
        except Exception as e:
            raise Exception(f"Error updating folder: {str(e)}")
    
    async def delete_folder(self, folder_id: str) -> bool:
        """Delete a folder"""
        try:
            from bson import ObjectId
            existing = await self.get_folder_by_id(folder_id)
            if not existing:
                return False
            
            collection = await self._get_collection()
            result = await collection.delete_one({"_id": ObjectId(folder_id)})
            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Error deleting folder: {str(e)}")
