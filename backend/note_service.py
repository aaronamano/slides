from typing import List, Optional
from pydantic import BaseModel
from mongo_client import MongoClient
from bson import ObjectId

class NoteCreate(BaseModel):
    notes: str

class NoteUpdate(BaseModel):
    notes: Optional[str] = None

class NoteResponse(BaseModel):
    id: str
    notes: str
    
    class Config:
        from_attributes = True

class NoteService:
    def __init__(self):
        self.collection = None
    
    async def _get_collection(self):
        if self.collection is None:
            self.collection = await MongoClient.get_notes_collection()
        return self.collection
    
    async def create_note(self, note: NoteCreate) -> NoteResponse:
        """Create a new note"""
        try:
            collection = await self._get_collection()
            note_doc = {
                "notes": note.notes
            }
            
            result = await collection.insert_one(note_doc)
            
            # Retrieve the inserted document
            inserted_doc = await collection.find_one({"_id": result.inserted_id})
            inserted_doc['id'] = str(inserted_doc['_id'])
            del inserted_doc['_id']
            
            return NoteResponse(**inserted_doc)
        except Exception as e:
            raise Exception(f"Error creating note: {str(e)}")
    
    async def get_all_notes(self) -> List[NoteResponse]:
        """Get all notes"""
        try:
            collection = await self._get_collection()
            notes = []
            async for note in collection.find():
                note['id'] = str(note['_id'])
                del note['_id']
                notes.append(NoteResponse(**note))
            return notes
        except Exception as e:
            raise Exception(f"Error fetching notes: {str(e)}")
    
    async def get_note_by_id(self, note_id: str) -> Optional[NoteResponse]:
        """Get a specific note by ID"""
        try:
            collection = await self._get_collection()
            note = await collection.find_one({"_id": ObjectId(note_id)})
            if note:
                note['id'] = str(note['_id'])
                del note['_id']
                return NoteResponse(**note)
            return None
        except Exception as e:
            raise Exception(f"Error fetching note: {str(e)}")
    
    async def update_note(self, note_id: str, note_update: NoteUpdate) -> Optional[NoteResponse]:
        """Update an existing note"""
        try:
            # Check if note exists
            existing = await self.get_note_by_id(note_id)
            if not existing:
                return None
            
            collection = await self._get_collection()
            update_data = {}
            
            if note_update.notes:
                update_data["notes"] = note_update.notes
            
            if update_data:
                await collection.update_one(
                    {"_id": ObjectId(note_id)}, 
                    {"$set": update_data}
                )
            
            return await self.get_note_by_id(note_id)
        except Exception as e:
            raise Exception(f"Error updating note: {str(e)}")
    
    async def delete_note(self, note_id: str) -> bool:
        """Delete a note"""
        try:
            # Check if note exists
            existing = await self.get_note_by_id(note_id)
            if not existing:
                return False
            
            collection = await self._get_collection()
            result = await collection.delete_one({"_id": ObjectId(note_id)})
            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Error deleting note: {str(e)}")