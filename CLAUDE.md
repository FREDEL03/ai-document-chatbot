# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` – Start Next.js dev server
- `npm run build` – Production build
- `npm run start` – Start production server
- `npm run lint` – ESLint (no type checking; run `npx tsc --noEmit` separately)

No test framework yet. Stack: Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (auth, Postgres + pgvector, storage), Google Gemini (`@google/genai`). Next.js 16 has breaking changes — see `AGENTS.md` and read `node_modules/next/dist/docs/` before using unfamiliar APIs.

## What this app is

"DocuChat AI": sign in, upload up to 5 documents (PDF, images, TXT, DOC, DOCX, ≤4.5 MB each), and chat with them. Also works as a general chat with no document. Chat history is stored per user in `localStorage` (`docuchat_convos_<userId>`), not in the database.

## Layout

- `app/page.tsx` – Client component: auth gate, all state and handlers (send, upload, view, delete, conversations).
- `app/components/chat/` – Presentational pieces of the chat screen, props named after the `page.tsx` state they receive: `Sidebar`, `MessageList` (markdown, copy, source chips), `Composer`, `ConfirmDialogs`, `DocModal`, plus `types.ts` (`Message`, `UploadedDoc`, `Conversation`, `MAX_DOCS`) and `markdown.tsx`.
- `app/components/` – `LandingPage`, `AuthModal`, `FileViewer` (TXT/DOCX/DOC viewer).
- `app/api/chat/route.ts` – Embeds the question, retrieves top chunks, streams the Gemini answer.
- `app/api/upload/route.ts` – Stores the file in Supabase Storage, extracts text, chunks, embeds, saves to `document_chunks`.
- `app/api/document/route.ts` – Returns a signed URL and extracted text for the viewer.
- `src/lib/` – `api-guard.ts` (auth + rate limit), `auth-fetch.ts` (client fetch with token), `embed.ts`, `chunk-text.ts`, `read-images.ts` (Gemini vision OCR), `supabase-admin.ts` (service role, server only), `supabase-client.ts` (browser).
- SQL (run manually in the Supabase SQL editor): `supabase-schema.sql`, `add-storage-policy.sql`, `add-vector-search.sql`, and `update-match-chunks.sql` (only if `add-vector-search.sql` was run before page citations).

## How the pieces work

- **Auth**: every API route calls `guard(request, bucket, limitPerMinute)` first. It verifies the `Authorization: Bearer <access token>` header via Supabase and rate-limits per user (in-memory per instance). Client code must use `authFetch`, never plain `fetch`, for these routes. `userId` is taken from the verified token — never from the request body.
- **Ownership**: API routes use the service role, which bypasses RLS, so queries must filter `user_id` explicitly.
- **Chunking / RAG**: text is chunked at 1000 chars with 200 overlap. PDFs are chunked per page so each chunk has `metadata.page`. Chunks are embedded with `gemini-embedding-001` (768 dims, `src/lib/embed.ts`) into `document_chunks.embedding vector(768)`. Chat calls the `match_chunks` RPC; if embeddings or the RPC are unavailable it falls back to the first 20 chunks.
- **Streaming**: `/api/chat` returns `text/plain` streamed text with an `X-Sources` header (URL-encoded JSON `[{d: docId, p: page|null}]`). Errors, mock replies and cached answers return JSON instead (`{ answer, sources, cached }`); the client branches on `Content-Type`. Models are tried in order (`gemini-2.5-flash`, then `gemini-3-flash-preview`).
- **Citations**: source chips under an answer open the document viewer at that page (PDF `#page=N`). Only PDFs uploaded after page-chunking have page numbers.
- **Q&A cache**: in-memory, keyed by user + documents + normalized question, 24 h TTL. Only complete answers are cached.

## Environment (`.env.local`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `NEXT_PUBLIC_MOCK_AI=true` to return canned answers without calling Gemini.

## Known gaps

- Rate limit and Q&A cache are per server instance (not shared on serverless).
- Chat history lives only in the browser's `localStorage`.
- Documents uploaded before embeddings/page-chunking need re-uploading to benefit.
- ESLint reports many pre-existing `no-explicit-any` errors.
