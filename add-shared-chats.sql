-- Run once in the Supabase SQL editor.
-- Read-only snapshots of chats that a user chose to share via link (/s/<id>).
CREATE TABLE IF NOT EXISTS shared_chats (
  id text PRIMARY KEY,                       -- unguessable random token used in the link
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_names text[] NOT NULL DEFAULT '{}',
  messages jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_chats_user_idx ON shared_chats (user_id, created_at DESC);

-- RLS on with NO policies: the browser (anon/authenticated keys) can't read or write this table at all.
-- Only the server (service role) touches it, and it only returns a row to someone who knows the token.
ALTER TABLE shared_chats ENABLE ROW LEVEL SECURITY;
