"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Link2, Copy, Trash2 } from "lucide-react";
import { authFetch } from "@/src/lib/auth-fetch";
import type { Message, UploadedDoc } from "./types";

type Share = { id: string; title: string; created_at: string };

const linkFor = (id: string) => `${window.location.origin}/s/${id}`;

// Creates read-only snapshots of the current chat that anyone with the link can open, and lets you revoke them
export function ShareModal({ messages, documents, onClose }: { messages: Message[]; documents: UploadedDoc[]; onClose: () => void }) {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/share");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load your shared links");
        if (!cancelled) setShares(data.shares);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Could not load your shared links");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(linkFor(id));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };

  const create = async () => {
    setCreating(true);
    try {
      const title = messages.find((m) => m.sender === "user")?.text ?? "Shared chat";
      const res = await authFetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          documentNames: documents.map((d) => d.name),
          messages: messages.map((m) => ({
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
            // only names and pages are shared, never ids or files
            sources: m.sources
              ?.map((s) => ({ name: documents.find((d) => d.id === s.d)?.name ?? "", p: s.p }))
              .filter((s) => s.name),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create the link");
      setShares((prev) => [{ id: data.id, title: title.slice(0, 80), created_at: new Date().toISOString() }, ...(prev ?? [])]);
      setError("");
      await copy(data.id);
    } catch (err: any) {
      toast.error(err?.message || "Could not create the link");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      const res = await authFetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Could not delete the link");
      setShares((prev) => prev?.filter((s) => s.id !== id) ?? prev);
      toast.info("Link deleted. It no longer works.");
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the link");
    }
  };

  const hasQuestion = messages.some((m) => m.sender === "user");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2B2B2E]/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[88vh] bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">Share this chat</h3>
            <p className="text-[11px] text-muted">Creates a read-only link to a snapshot of the conversation.</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-foreground rounded-xl hover:bg-surface cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-4 space-y-3 shrink-0">
          <p className="text-xs text-foreground bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
            <span className="font-semibold">Anyone with the link can read this chat</span>, including your questions, the answers, and the names of
            your documents. The document files themselves are not shared. Later messages won&apos;t appear in the link. You can delete it any time.
          </p>
          <button
            onClick={create}
            disabled={creating || !hasQuestion}
            className="w-full py-2.5 rounded-xl bg-[#5B6CFF] hover:bg-[#4a5be8] text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            {hasQuestion ? "Create link and copy" : "Ask a question first"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-[4rem]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Your shared links</p>
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : shares === null ? (
            <div className="flex items-center gap-2 py-4 text-muted text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#5B6CFF]" /> Loading...
            </div>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted py-2">You haven&apos;t shared anything yet.</p>
          ) : (
            shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border bg-background">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate" title={s.title}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-muted">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => copy(s.id)} className="p-1.5 text-[#5B6CFF] hover:bg-[#5B6CFF]/10 rounded-md cursor-pointer" title="Copy link">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => revoke(s.id)} className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer" title="Delete link">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
