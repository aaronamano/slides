## Problem
During college, most professors I had classes with teach by using lecture slide materials. Lecture slides are the best sort of knowledge, but they can be disorganized in certain ways:

- Personally, I had to download slides on Canvas, save it on my local computer, and try to look for it again in the midst of other files and documents I had -> **it was hard to organize my slides in one place**
- Also, when I needed to look for certain topics or concepts from lecture slides, there were tons of information to go through -> **the endless amount of searching and scrolling killed time**

This is where SlidES comes in! I made the *-es* suffix capitalized to emphasize ElasticSearch aka ES :)

## What SlidES does
It's a dashboard to upload and organize your lecture slides as PDF files. When you upload your PDF file, text is extracted from the file, stored using ElasticSearch’s index database, and embedded as sparse vectors through an Elser Pipeline.

You can ask the SlidES Agent questions about certain topics that you need to ask or generate notes for you, which you can copy as a markdown and create yourself. Using Elastic Search’s built-in agent search tool, it looks through slides in the index database, find the relevant content you need, and responds with that information to you.

## How it’s built
- **Frontend**: Next.js, Shadcn, Tailwind
- **Backend**: FastAPI, Kibana API
- **Database**: ElasticSearch’s index database, MongoDB (just to store course names and course IDs)

## ElasticSearch features
- **Index databases**: I used multiple index databases to store lecture slides, notes, and folders
- **Agent Builder**: Using Agent Builder, I created my own agent and gave it instructions to only search for notes and lectures slides in the index databases in order to answer certain questions about it and generate notes
- **Kibana API**: With Kibana’s API, I invoked my agent using the `/api/agent_builder/converse` endpoint which delivers real time streaming responses, which are rendered onto my UI
- **Ingest Pipeline**: Using Kibana’s Dev Tools, I created an ingest pipeline using `.elser_model_2` to convert extracted text from lecture slide PDFs into sparse vectors
