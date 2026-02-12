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

# Index DB Schema

```json
{
    "course_id": { "type": "keyword" },
    "course_name": { "type": "text" },
    "filename": { "type": "keyword" },
    "title": { "type": "text" },
    "text_content": { "type": "text" },
    "vector_content": { "type": "dense_vector", "dims": 1024, "index": True, "similarity": "cosine" },
    "pdf_binary": {
        "type": "binary",
        "store": True,
        "doc_values": False
    },
    "pdf_size": { "type": "long" },
    "has_binary": { "type": "boolean" }
}
```

# Folder Structure

```
└── backend
    └── __pycache__
        ├── course_service.cpython-314.pyc
        ├── mongo_client.cpython-314.pyc
        ├── note_service.cpython-314.pyc
    └── elastic-search
        ├── init.py # run this file ONCE to define mappings
    ├── .env
    ├── .gitignore
    ├── api.py
    ├── BACKEND.md
    ├── course_service.py
    ├── mongo_client.py
    ├── note_service.py
    └── requirements.txt
```

# API Routes

- POST `/api/upload`
- GET `/api/slides/{course_id}`
- POST `/api/agent_builder/mcp`

# Process

import PDF file ➡️ extract text ➡️ embed text to 1024 dimension vectors ➡️ add extracted text to `text_content` as a string and add vector embeddings to `vector_content` as an array of decimal values

# MongoDB

## Courses Collection

```typescript
{
  "course_id": String,
  "course_name": String,
}
```

## Notes Collection

```typescript
{
  "folder_id": String,
  "notes": String
}
```

## Folder Collection

```typescript
{
    "folder_name": String
}
```
