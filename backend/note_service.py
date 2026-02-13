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

notes_index = "notes-index"


class NoteCreate(BaseModel):
    title: str
    notes: str
    folder_id: Optional[str] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    folder_id: Optional[str] = None


class NoteResponse(BaseModel):
    id: str
    title: str
    notes: str
    folder_id: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class NoteService:
    def __init__(self):
        pass

    def create_note(self, note: NoteCreate) -> NoteResponse:
        try:
            now = datetime.utcnow().isoformat()
            doc = {
                "title": note.title,
                "notes": note.notes,
                "created_at": now,
                "updated_at": now
            }
            if note.folder_id:
                doc["folder_id"] = note.folder_id

            response = client.index(index=notes_index, body=doc)
            doc["id"] = response["_id"]
            return NoteResponse(**doc)
        except Exception as e:
            raise Exception(f"Error creating note: {str(e)}")

    def get_all_notes(self) -> List[NoteResponse]:
        try:
            response = client.search(index=notes_index, body={"query": {"match_all": {}}})
            notes = []
            for hit in response["hits"]["hits"]:
                note_data = hit["_source"]
                note_data["id"] = hit["_id"]
                notes.append(NoteResponse(**note_data))
            return notes
        except Exception as e:
            raise Exception(f"Error fetching notes: {str(e)}")

    def get_note_by_id(self, note_id: str) -> Optional[NoteResponse]:
        try:
            response = client.get(index=notes_index, id=note_id)
            if response["found"]:
                note_data = response["_source"]
                note_data["id"] = response["_id"]
                return NoteResponse(**note_data)
            return None
        except Exception as e:
            return None

    def update_note(self, note_id: str, note_update: NoteUpdate) -> Optional[NoteResponse]:
        try:
            existing = self.get_note_by_id(note_id)
            if not existing:
                return None

            update_data = {"updated_at": datetime.utcnow().isoformat()}

            if note_update.title is not None:
                update_data["title"] = note_update.title
            if note_update.notes:
                update_data["notes"] = note_update.notes
            if note_update.folder_id is not None:
                update_data["folder_id"] = note_update.folder_id

            client.update(index=notes_index, id=note_id, body={"doc": update_data})
            return self.get_note_by_id(note_id)
        except Exception as e:
            raise Exception(f"Error updating note: {str(e)}")

    def delete_note(self, note_id: str) -> bool:
        try:
            response = client.delete(index=notes_index, id=note_id)
            return response.get("result") in ["deleted", "not_found"]
        except Exception as e:
            return False
