-- Migration V5: Add Intent column to Query Logs & Intent Handling support to Evaluations
-- Schema: general_rag

-- 1. Add intent column to query_logs
ALTER TABLE general_rag.query_logs ADD COLUMN IF NOT EXISTS intent VARCHAR(50) DEFAULT 'knowledge_query' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_query_logs_intent ON general_rag.query_logs(intent);

-- 2. Add intent & evaluation_type columns to evaluations
ALTER TABLE general_rag.evaluations ADD COLUMN IF NOT EXISTS intent VARCHAR(50) DEFAULT 'knowledge_query' NOT NULL;
ALTER TABLE general_rag.evaluations ADD COLUMN IF NOT EXISTS evaluation_type VARCHAR(50) DEFAULT 'knowledge_query' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluations_intent ON general_rag.evaluations(intent);
CREATE INDEX IF NOT EXISTS idx_evaluations_type ON general_rag.evaluations(evaluation_type);
