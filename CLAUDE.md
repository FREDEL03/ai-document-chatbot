# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` – Start Next.js development server with Turbopack (Tailwind CSS v4)
- `npm run build` – Build for production
- `npm run start` – Start production server
- `npm run lint` – Run ESLint (no TypeScript type checking; use `tsc --noEmit` manually)

No test framework installed yet. The project uses Next.js 16.4.2, React 19.3.0, and Tailwind CSS v4 with its new `@import "tailwindcss";` syntax.

## Project Structure

This is a fresh Next.js 16 App Router project named "DocuChat AI" – a document chatbot UI prototype. Currently UI‑only, no AI or backend.

- **`app/page.tsx`** – Main chat UI (Client Component)
  - State: `message` (current input), `messages` (chat history)
  - Sidebar (260px dark navy) + chat panel (light gray) layout
  - Two‑column desktop; single column on mobile (<640px) hiding upload button and sidebar note
  - Accent color: blue‑600 `#2458d3` (configured in globals.css)
- **`app/layout.tsx`** – Root layout with Geist fonts
- **`app/globals.css`** – Tailwind v4 import with custom theme overrides for background colors
- **`.env.local`** – Placeholder for AI service keys and feature flags (`NEXT_PUBLIC_ENABLE_UPLOAD=false`)

## Architecture Notes

- **App Router**: No `src/` directory; all app files directly in `app/`.
- **Styling**: Tailwind CSS v4 with built‑in theme configuration in CSS. Custom blue accent `#2458d3` set via `--color-blue-600` in `@theme inline`.
- **State Management**: Currently simple React `useState`; no external state library.
- **Responsive**: Mobile‑first responsive design using Tailwind breakpoints (`sm:`). Sidebar hidden on small screens.
- **Future AI Integration**: Environment variables prepared for OpenAI, Anthropic, Groq API keys, and backend URL.
- **Current Limitations**: "Upload Document" button disabled; chat messages only stored in‑memory (clears on refresh).