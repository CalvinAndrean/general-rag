-- Migration Script for General RAG Core
-- Schema: general_rag
-- Database: general-db

-- 1. Create schema general_rag
CREATE SCHEMA IF NOT EXISTS general_rag;

-- 2. Enable pgvector extension inside general_rag
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. Create Documents table
CREATE TABLE IF NOT EXISTS general_rag.documents (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    s3_url VARCHAR(1024),
    file_size BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON general_rag.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON general_rag.documents(created_at DESC);

-- 4. Create Document Chunks table with vector embedding column (2048 dimensions)
CREATE TABLE IF NOT EXISTS general_rag.document_chunks (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES general_rag.documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    page_number INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector, -- Unconstrained vector dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON general_rag.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_chunk_idx ON general_rag.document_chunks(document_id, chunk_index);

-- Note on Vector Indexing for > 2000 Dimensions:
-- pgvector's standard HNSW / IVFFlat indexes have a hard limit of 2000 dimensions.
-- For 2048 dimensions, exact nearest neighbor search (ORDER BY embedding <=> query_vector) works natively.
-- If HNSW indexing is required for high dimension counts on pgvector >= 0.7.0, halfvec indexing can be used:
-- CREATE INDEX IF NOT EXISTS idx_chunks_embedding_halfvec ON general_rag.document_chunks USING hnsw ((embedding::halfvec(2048)) halfvec_cosine_ops);
