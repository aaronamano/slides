from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os
import PyPDF2
from sentence_transformers import SentenceTransformer
import io

app = FastAPI()

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

model = SentenceTransformer('all-roberta-large-v1')

index_name = "lecture-slides-index"

@app.post("/api/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    course_name: str = Form(...),
    title: str = Form(...)
):
    try:
        pdf_content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        
        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text()
        
        vector_content = model.encode(text_content).tolist()
        
        doc = {
            "course_id": course_id,
            "course_name": course_name,
            "filename": file.filename,
            "title": title,
            "text_content": text_content,
            "vector_content": vector_content
        }
        
        response = client.index(index=index_name, body=doc)
        
        return {
            "message": "PDF uploaded and processed successfully",
            "document_id": response['_id'],
            "course_id": course_id,
            "course_name": course_name,
            "title": title,
            "filename": file.filename
        }
        
    except Exception as e:
        return {"error": f"Failed to process PDF: {str(e)}"}

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
                "text_content": hit['_source']['text_content']
            })
            
        return {"slides": slides, "total": len(slides)}
        
    except Exception as e:
        return {"error": f"Failed to retrieve slides: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)