-- Migration V2: Auth, Multi-Tenant, Usage & Evaluation
-- Schema: general_rag
-- Database: general_db
-- Run AFTER migration.sql

-- 1. Tenants table
CREATE TABLE IF NOT EXISTS general_rag.tenants (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS general_rag.users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    tenant_id VARCHAR(36) NOT NULL REFERENCES general_rag.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Query logs table
CREATE TABLE IF NOT EXISTS general_rag.query_logs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES general_rag.tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES general_rag.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    model_name VARCHAR(100),
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    estimated_cost NUMERIC(10,6) DEFAULT 0,
    latency_ms INT,
    top_k INT DEFAULT 4,
    sources_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Tenant settings table
CREATE TABLE IF NOT EXISTS general_rag.tenant_settings (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) UNIQUE NOT NULL REFERENCES general_rag.tenants(id) ON DELETE CASCADE,
    llm_model VARCHAR(100) DEFAULT 'anthropic/claude-3.5-sonnet',
    embedding_model VARCHAR(100) DEFAULT 'openai/text-embedding-3-small',
    temperature NUMERIC(3,2) DEFAULT 0.70,
    max_tokens INT DEFAULT 2048,
    system_prompt TEXT,
    top_k INT DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Evaluations table
CREATE TABLE IF NOT EXISTS general_rag.evaluations (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES general_rag.tenants(id) ON DELETE CASCADE,
    query_log_id VARCHAR(36) REFERENCES general_rag.query_logs(id) ON DELETE SET NULL,
    faithfulness NUMERIC(5,4),
    answer_relevancy NUMERIC(5,4),
    context_precision NUMERIC(5,4),
    context_recall NUMERIC(5,4),
    overall_score NUMERIC(5,4),
    evaluation_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Add tenant_id to existing documents table
ALTER TABLE general_rag.documents ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) REFERENCES general_rag.tenants(id) ON DELETE SET NULL;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON general_rag.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON general_rag.users(email);
CREATE INDEX IF NOT EXISTS idx_query_logs_tenant ON general_rag.query_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_user ON general_rag.query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created ON general_rag.query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON general_rag.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_tenant ON general_rag.evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_query_log ON general_rag.evaluations(query_log_id);
