-- Run once in the Supabase SQL editor.
-- Adds tags to documents (used by the Library: filter and organize your uploaded files).
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS documents_tags_idx ON documents USING GIN (tags);
