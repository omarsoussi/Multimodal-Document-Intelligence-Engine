# Multimodal Document Intelligence Engine

Upload PDFs, scanned contracts, or images. Ask questions in plain English. Get cited answers without external AI API keys.

## Stack
- FastAPI + LlamaIndex + Qdrant + local OCR/vector search
- React + Vite + TailwindCSS
- Fully containerized with Docker Compose

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env`
3. Run: `docker compose up --build`
4. Open: http://localhost:3000

## API
Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| POST | /documents/upload | Upload a document |
| GET | /documents | List all documents |
| DELETE | /documents/{id} | Delete a document |
| POST | /query | Ask a question |

## Architecture
[Insert architecture diagram here]
