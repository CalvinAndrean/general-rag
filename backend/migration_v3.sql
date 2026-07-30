-- Migration V3: Folders, Document Active State, Path, & Versioning
-- Schema: general_rag

-- 1. Create folders table
CREATE TABLE IF NOT EXISTS general_rag.folders (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(36) REFERENCES general_rag.folders(id) ON DELETE CASCADE,
    tenant_id VARCHAR(36) NOT NULL REFERENCES general_rag.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Add columns to documents table
ALTER TABLE general_rag.documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE general_rag.documents ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT 'v1.0' NOT NULL;
ALTER TABLE general_rag.documents ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36) REFERENCES general_rag.folders(id) ON DELETE SET NULL;
ALTER TABLE general_rag.documents ADD COLUMN IF NOT EXISTS folder_path VARCHAR(512) DEFAULT '/' NOT NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_documents_is_active ON general_rag.documents(is_active);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON general_rag.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_tenant ON general_rag.folders(tenant_id);

-- 4. Add log_type column to query_logs table
ALTER TABLE general_rag.query_logs ADD COLUMN IF NOT EXISTS log_type VARCHAR(20) DEFAULT 'query' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_query_logs_log_type ON general_rag.query_logs(log_type);
