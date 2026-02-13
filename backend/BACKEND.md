# Set up backend

```bash
cd backend
conda create -n slides-env -y python=3.14
conda activate slides-env
pip install -r requirements.txt
```

# Run Python API

```bash
conda activate slides-env
python api.py
```

# Elastic Search Index DB Schema
## Lecture Slides Index
```json
{
    "course_id": { "type": "keyword" },
    "course_name": { "type": "text" },
    "filename": { "type": "keyword" },
    "title": { "type": "text" },
    "text_content": { "type": "text" },
    "text_embedding": { "type": "sparse_vector" },
    "pdf_binary": {
        "type": "binary",
        "store": True,
        "doc_values": False
    },
    "pdf_size": { "type": "long" },
    "has_binary": { "type": "boolean" }
}
```

## Notes Index
```json
{
  "title": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
  "notes": { "type": "text" },
  "folder_id": { "type": "keyword" },
  "created_at": { "type": "date" },
  "updated_at": { "type": "date" }
}
```

## Folders Index
```json
{
  "folder_name": {
    "type": "text",
    "fields": { "keyword": { "type": "keyword" } }
  },
  "created_at": { "type": "date" },
  "updated_at": { "type": "date" }
}
```

# Folder Structure
```
└── backend
    └── elastic-search
        ├── lecture-slides-init.py
        ├── notes-folders-init.py
        ├── PIPELINE.md
        ├── RESULT.md
    ├── .gitignore
    ├── api.py
    ├── BACKEND.md
    ├── course_service.py
    ├── folder_service.py
    ├── mongo_client.py
    ├── note_service.py
    └── requirements.txt
```

# Process
import PDF file ➡️ extract text ➡️ embed text to sparse vectors ➡️ add extracted text to `text_content` as a string and add vector embeddings to `text_embedding`

# MongoDB
## Courses Collection

```typescript
{
  "course_id": string,
  "course_name": string,
}
```
