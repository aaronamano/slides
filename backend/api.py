from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os
import PyPDF2
import io
import base64
from typing import List

from course_service import CourseCreate, CourseUpdate, CourseResponse, CourseService
from note_service import NoteCreate, NoteUpdate, NoteResponse, NoteService
from folder_service import FolderCreate, FolderUpdate, FolderResponse, FolderService

app = FastAPI()

# Initialize Services
course_service = CourseService()
note_service = NoteService()
folder_service = FolderService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

client = Elasticsearch(
    str(os.getenv('ELASTICSEARCH_URL')),
    api_key=str(os.getenv('ELASTICSEARCH_API_KEY'))
)

index_name = "lecture-slides-index"



@app.get("/")
async def get_message():
    return "Hello World"



@app.get("/api/pdf/{document_id}")
async def get_pdf_binary(document_id: str):
    """Retrieve PDF binary data from Elasticsearch"""
    try:
        response = client.get(index=index_name, id=document_id)
        
        if not response['found']:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = response['_source']
        
        # Check if document has binary data
        if not doc.get('has_binary', False) or not doc.get('pdf_binary'):
            raise HTTPException(
                status_code=404, 
                detail="PDF binary data not available for this document"
            )
        
        return {
            "document_id": document_id,
            "filename": doc.get('filename'),
            "pdf_binary": doc.get('pdf_binary'),
            "pdf_size": doc.get('pdf_size'),
            "title": doc.get('title')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve PDF: {str(e)}")

@app.get("/api/slides/{course_id}")
async def get_slides_by_course(course_id: str):
    try:
        response = client.search(
            index=index_name,
            body={
                "query": {
                    "term": {
                        "course_id": course_id
                    }
                }
            }
        )
        
        slides = []
        for hit in response['hits']['hits']:
            slides.append({
                "id": hit['_id'],
                "course_id": hit['_source']['course_id'],
                "course_name": hit['_source']['course_name'],
                "filename": hit['_source']['filename'],
                "title": hit['_source']['title'],
                "text_content": hit['_source']['text_content'],
                "has_binary": hit['_source'].get('has_binary', False)
            })
            
        return {"slides": slides, "total": len(slides)}
        
    except Exception as e:
        return {"error": f"Failed to retrieve slides: {str(e)}"}

@app.post("/api/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    course_name: str = Form(...),
    title: str = Form(...)
):
    try:
        pdf_content = await file.read()
        pdf_size = len(pdf_content)
        

        
        # Convert PDF to Base64 for Elasticsearch storage
        pdf_binary = base64.b64encode(pdf_content).decode('utf-8')
        
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        
        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text()
        
        doc = {
            "course_id": course_id,
            "course_name": course_name,
            "filename": file.filename,
            "title": title,
            "text_content": text_content,
            "pdf_binary": pdf_binary,
            "pdf_size": pdf_size,
            "has_binary": True
        }
        
        response = client.index(index=index_name, body=doc, pipeline="elser-pipeline")
        
        return {
            "message": "PDF uploaded and processed successfully",
            "document_id": response['_id'],
            "course_id": course_id,
            "course_name": course_name,
            "title": title,
            "filename": file.filename,
            "pdf_size": pdf_size,
            "has_binary": True
        }
        
    except Exception as e:
        return {"error": f"Failed to process PDF: {str(e)}"}



# Course CRUD API Routes
@app.get("/api/courses", response_model=List[CourseResponse])
async def get_all_courses():
    """Get all courses"""
    try:
        return await course_service.get_all_courses()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses/{course_id}", response_model=CourseResponse)
async def get_course_by_id(course_id: str):
    """Get a specific course by course_id"""
    try:
        course = await course_service.get_course_by_id(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        return course
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/courses", response_model=CourseResponse)
async def create_course(course: CourseCreate):
    """Create a new course"""
    try:
        return await course_service.create_course(course)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/courses/{course_id}", response_model=CourseResponse)
async def update_course(course_id: str, course_update: CourseUpdate):
    """Update an existing course"""
    try:
        course = await course_service.update_course(course_id, course_update)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        return course
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/courses/{course_id}")
async def delete_course(course_id: str):
    """Delete a course"""
    try:
        success = await course_service.delete_course(course_id)
        if not success:
            raise HTTPException(status_code=404, detail="Course not found")
        return {"message": "Course deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses/dropdown/options")
async def get_courses_for_dropdown():
    """Get courses formatted for dropdown options"""
    try:
        return await course_service.get_courses_for_dropdown()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Note CRUD API Routes
@app.get("/api/notes", response_model=List[NoteResponse])
async def get_all_notes():
    """Get all notes"""
    try:
        return note_service.get_all_notes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notes/{note_id}", response_model=NoteResponse)
async def get_note_by_id(note_id: str):
    """Get a specific note by ID"""
    try:
        note = note_service.get_note_by_id(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        return note
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notes", response_model=NoteResponse)
async def create_note(note: NoteCreate):
    """Create a new note"""
    try:
        return note_service.create_note(note)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, note_update: NoteUpdate):
    """Update an existing note"""
    try:
        note = note_service.update_note(note_id, note_update)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        return note
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note"""
    try:
        success = note_service.delete_note(note_id)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Folder CRUD API Routes
@app.get("/api/folders", response_model=List[FolderResponse])
async def get_all_folders():
    """Get all folders"""
    try:
        return folder_service.get_all_folders()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/folders/{folder_id}", response_model=FolderResponse)
async def get_folder_by_id(folder_id: str):
    """Get a specific folder by ID"""
    try:
        folder = folder_service.get_folder_by_id(folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
        return folder
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/folders", response_model=FolderResponse)
async def create_folder(folder: FolderCreate):
    """Create a new folder"""
    try:
        return folder_service.create_folder(folder)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(folder_id: str, folder_update: FolderUpdate):
    """Update an existing folder"""
    try:
        folder = folder_service.update_folder(folder_id, folder_update)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
        return folder
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: str):
    """Delete a folder"""
    try:
        success = folder_service.delete_folder(folder_id)
        if not success:
            raise HTTPException(status_code=404, detail="Folder not found")
        return {"message": "Folder deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/slides/{document_id}")
async def delete_slide(document_id: str):
    """Delete a lecture slide from Elasticsearch"""
    try:
        response = client.delete(index=index_name, id=document_id)
        
        if response.get('result') == 'not_found':
            raise HTTPException(status_code=404, detail="Slide not found")
        
        return {"message": "Slide deleted successfully", "document_id": document_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete slide: {str(e)}")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)