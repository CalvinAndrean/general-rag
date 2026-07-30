-- Migration v4: Add status column to evaluations table
ALTER TABLE general_rag.evaluations ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'COMPLETED';
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON general_rag.evaluations (status);
