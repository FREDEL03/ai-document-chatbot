-- Only needed if you ALREADY ran add-vector-search.sql before page citations.
-- Adds `metadata` (page number) to the match_chunks result. Safe to re-run; keeps existing embeddings.
DROP FUNCTION IF EXISTS match_chunks(vector, uuid[], int);

CREATE FUNCTION match_chunks(
  query_embedding vector(768),
  doc_ids uuid[],
  match_count int DEFAULT 6
)
RETURNS TABLE (document_id uuid, chunk_index int, content text, metadata jsonb, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT c.document_id, c.chunk_index, c.content, c.metadata,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM document_chunks c
  WHERE c.document_id = ANY(doc_ids) AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
