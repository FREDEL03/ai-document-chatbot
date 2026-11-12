import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, FileText } from "lucide-react";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import { markdownComponents } from "@/app/components/chat/markdown";

// Public, read-only view of a chat someone chose to share. Not indexed by search engines.
export const metadata: Metadata = {
  title: "Shared chat · DocuChat AI",
  robots: { index: false, follow: false },
};

type SharedMessage = { sender: "user" | "ai"; text: string; timestamp?: string; sources?: { name: string; p: number | null }[] };

async function SharedChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(id)) notFound(); // cheap reject before touching the database

  const { data } = await getSupabaseAdmin()
    .from("shared_chats")
    .select("title, doc_names, messages, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const messages = data.messages as SharedMessage[];
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2 pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5B6CFF]">
          <Sparkles className="w-4 h-4" /> DocuChat AI · shared chat (read-only)
        </div>
        <h1 className="text-xl font-bold text-heading">{data.title}</h1>
        <p className="text-xs text-muted">Shared on {new Date(data.created_at).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
        {data.doc_names?.length > 0 && (
          <p className="text-xs text-muted flex flex-wrap items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Based on: {data.doc_names.join(", ")}
          </p>
        )}
      </header>

      <div className="space-y-5">
        {messages.map((m, i) =>
          m.sender === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-[#5B6CFF] text-white shadow-xs">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="bg-card border border-border rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs text-foreground">
              <div className="text-sm leading-relaxed overflow-hidden">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {m.text}
                </ReactMarkdown>
              </div>
              {m.sources && m.sources.length > 0 && (
                <p className="pt-2 text-[11px] text-muted">
                  Sources: {m.sources.map((s) => (s.p ? `${s.name} · p.${s.p}` : s.name)).join("; ")}
                </p>
              )}
            </div>
          )
        )}
      </div>

      <footer className="pt-4 border-t border-border text-center text-xs text-muted">
        This is a read-only copy. <a href="/" className="text-[#5B6CFF] font-medium hover:underline">Try DocuChat AI</a>
      </footer>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  // body is overflow:hidden app-wide (the chat UI scrolls internally), so this page scrolls itself
  return (
    <div className="h-screen overflow-y-auto bg-background">
      <Suspense fallback={<p className="p-8 text-center text-sm text-muted">Loading shared chat...</p>}>
        <SharedChat params={params} />
      </Suspense>
    </div>
  );
}
