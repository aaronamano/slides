ELSER pipeline to convert text to sparse vector embeddings

# Create Pipeline
PUT _ingest/pipeline/elser-pipeline
{
  "processors": [
    {
      "inference": {
        "model_id": ".elser_model_2",
        "input_output": [
          {
            "input_field": "text_content",
            "output_field": "text_embedding"
          }
        ]
      }
    }
  ]
}

# Get Pipeline
GET _ingest/pipeline/elser-pipeline