from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize Elasticsearch client
client = Elasticsearch(
    str(os.getenv('ELASTICSEARCH_URL')),
    api_key=str(os.getenv('ELASTICSEARCH_API_KEY'))
)

index_name = "lecture-slides-index-test"

# Define the optimized lecture slides index mapping
mappings = {
    "properties": {
        "course_id": { "type": "keyword" },
        "course_name": { "type": "text" },
        "filename": { "type": "keyword" },
        "title": { "type": "text" },
        "text_content": { "type": "text" },
        "vector_content": { "type": "dense_vector", "dims": 3, "index": True, "similarity": "cosine" }
    }
}

mapping_response = client.indices.put_mapping(index=index_name, body=mappings)
print(mapping_response)
