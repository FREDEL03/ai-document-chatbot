-- Run once in the Supabase SQL editor.
-- Enables pgvector and turns document_chunks.embedding into a real vector column.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE document_chunks ADD COLUMN embedding vector(768);

-- Top-k most similar chunks within the given documents
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(768),
  doc_ids uuid[],
  match_count int DEFAULT 6
)
RETURNS TABLE (document_id uuid, chunk_index int, content text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT c.document_id, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM document_chunks c
  WHERE c.document_id = ANY(doc_ids) AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
