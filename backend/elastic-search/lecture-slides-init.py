from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize Elasticsearch client
client = Elasticsearch(
    str(os.getenv('ELASTICSEARCH_URL')),
    api_key=str(os.getenv('ELASTICSEARCH_API_KEY'))
)

index_name = "lecture-slides-index"

mappings = {
    "properties": {
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
}

mapping_response = client.indices.put_mapping(index=index_name, body=mappings)
print(mapping_response)
