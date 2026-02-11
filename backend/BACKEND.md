# Set up backend

```bash
cd backend
conda create -n slides-env -y python=3.14
conda activate slides-env
pip install -r requirements.txt
```

# Index DB Schema

```json
{
  "course_id": { "type": "keyword" },
  "course_name": { "type": "text" },
  "filename": { "type": "keyword" },
  "title": { "type": "text" },
  "text_content": { "type": "text" },
  "vector_content": {
    "type": "dense_vector",
    "dims": 1024,
    "index": true,
    "similarity": "cosine"
  }
}
```

# Folder Structure
```
└── backend
    └── elastic-search # actual database
        ├── init.py # run this file ONCE
    └── elastic-search-test # tested creation and insertion into index db
        ├── ingest.py
        ├── init.py
    ├── .env
    ├── .gitignore
    ├── BACKEND.md
    └── requirements.txt
```

# API Routes
- POST `/api/upload`
- GET `/api/slides/{course_id}`
- POST `/api/agent_builder/mcp`

# Process
import PDF file ➡️ extract text ➡️ embed text to 1024 dimension vectors ➡️ add extracted text to `text_content` as a string and add vector embeddings to `vector_content` as an array of decimal values
