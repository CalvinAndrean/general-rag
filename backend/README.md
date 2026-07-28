# General RAG System - Core Backend

Async **FastAPI** backend pipeline powering document ingestion (PDF, DOCX, XLSX, images with Mistral OCR fallback), chunking, vector storage via PostgreSQL `pgvector`, and contextual query generation via OpenRouter LLM streaming.

---

## 1. Database Setup & Migration

The system operates on PostgreSQL database `general-db` under schema `general_rag`.

### Run Standalone Migration
Execute the provided standalone migration script using `psql`:

```bash
psql -d general-db -f migration.sql
```

This idempotent script will:
- Create schema `general_rag`
- Enable `vector` (pgvector) extension
- Create `documents` and `document_chunks` tables
- Create HNSW vector similarity indexes

---

## 2. Environment Configuration

Copy `.env.example` to `.env` and provide your API keys:

```bash
cp .env.example .env
```

### Required Variables:
- `DATABASE_URL`: `postgresql+asyncpg://postgres:postgres@localhost:5432/general-db`
- `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_REGION`
- `MISTRAL_OCR_API_KEY`: API key for Mistral OCR service
- `OPENROUTER_API_KEY`: OpenRouter gateway key
- `EMBEDDING_MODEL_PROVIDER`: `openrouter`
- `EMBEDDING_MODEL_NAME`: `openai/text-embedding-3-small`
- `LLM_MODEL_NAME`: `anthropic/claude-3.5-sonnet`

---

## 3. Running Locally

### Install Dependencies:
```bash
uv sync
```

### Start Development Server:
```bash
uv run uvicorn app.main:app --reload --port 8000
```
- Swagger API Docs: `http://localhost:8000/api/v1/docs`
- Health Check: `http://localhost:8000/api/v1/health`

### Run Pytest Test Suite:
```bash
uv run pytest
```
