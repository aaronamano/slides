from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize Elasticsearch client
client = Elasticsearch(
    str(os.getenv('ELASTICSEARCH_URL')),
    api_key=str(os.getenv('ELASTICSEARCH_API_KEY'))
)
index_name = "lecture-slides-index-test"
docs = [
    {
        "course_id": "CIS150",
        "course_name": "Computer Science 1",
        "filename": "sample-keyword-filename",
        "text_content": "Learn Principles like this and that",
        "title": "Computer Science Lecture 1 Slides",
        "vector_content": [
            6.55,
            8.509,
            5.267
        ]
    },
    {
        "course_id": "CIS200",
        "course_name": "Computer Science 2",
        "filename": "sample-keyword-filename",
        "text_content": "Learn Principles like this and that",
        "title": "Object Oriented Programming Slides",
        "vector_content": [
            5.455,
            0.936,
            3.432
        ]
    }
]

bulk_response = helpers.bulk(client, docs, index=index_name)
print(bulk_response)