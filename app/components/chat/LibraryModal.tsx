"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Search, Plus, FileText, Tag } from "lucide-react";
import { authFetch } from "@/src/lib/auth-fetch";
import type { UploadedDoc } from "./types";

type LibDoc = { id: string; name: string; size: number; createdAt: string; tags: string[] };

type LibraryModalProps = {
  documents: UploadedDoc[]; // documents already in the current chat
  maxDocs: number;
  onAdd: (doc: UploadedDoc) => void;
  onClose: () => void;
};

const formatSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Every document you've ever uploaded: filter by tag, edit tags, and add any of them to the current chat
export function LibraryModal({ documents, maxDocs, onAdd, onClose }: LibraryModalProps) {
  const [docs, setDocs] = useState<LibDoc[] | null>(null);
  const [tagsEnabled, setTagsEnabled] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/library");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load your library");
        if (!cancelled) {
          setDocs(data.documents);
          setTagsEnabled(data.tagsEnabled);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Could not load your library");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveTags = async (doc: LibDoc, tags: string[]) => {
    try {
      const res = await authFetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, tags }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save tags");
      setDocs((prev) => prev?.map((d) => (d.id === doc.id ? { ...d, tags: data.tags } : d)) ?? prev);
    } catch (err: any) {
      toast.error(err?.message || "Could not save tags");
    }
  };

  const commitDraft = (doc: LibDoc) => {
    const tag = draft.trim();
    setEditingId(null);
    setDraft("");
    if (tag) saveTags(doc, [...doc.tags, tag]);
  };

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    docs?.forEach((d) => d.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [docs]);

  const q = query.trim().toLowerCase();
  const shown = (docs ?? []).filter(
    (d) => (!q || d.name.toLowerCase().includes(q)) && (!activeTag || d.tags.includes(activeTag))
  );
  const full = documents.length >= maxDocs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2B2B2E]/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[88vh] bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">Document Library</h3>
            <p className="text-[11px] text-muted">Everything you&apos;ve uploaded. Tag files and add them to this chat.</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-foreground rounded-xl hover:bg-surface cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-3 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by file name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-background border border-border focus:border-[#5B6CFF] focus:outline-none text-xs text-foreground placeholder-muted"
            />
          </div>
          {tagCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTag(null)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer ${
                  activeTag === null ? "bg-[#5B6CFF] text-white border-[#5B6CFF]" : "bg-card text-muted border-border hover:text-foreground"
                }`}
              >
                All
              </button>
              {tagCounts.map(([tag, n]) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer ${
                    activeTag === tag ? "bg-[#5B6CFF] text-white border-[#5B6CFF]" : "bg-card text-muted border-border hover:text-foreground"
                  }`}
                >
                  {tag} <span className="opacity-70">{n}</span>
                </button>
              ))}
            </div>
          )}
          {!tagsEnabled && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              Tags aren&apos;t set up yet. Run <code className="font-mono">add-document-tags.sql</code> in the Supabase SQL editor to enable them.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-2 min-h-[8rem]">
          {error ? (
            <p className="text-xs text-red-600 p-3">{error}</p>
          ) : docs === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#5B6CFF]" /> Loading your documents...
            </div>
          ) : shown.length === 0 ? (
            <p className="text-xs text-muted text-center py-10">
              {docs.length === 0 ? "No uploaded documents yet." : "No documents match your filter."}
            </p>
          ) : (
            shown.map((doc) => {
              const inChat = documents.some((d) => d.id === doc.id);
              return (
                <div key={doc.id} className="p-3 rounded-xl border border-border bg-background space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#5B6CFF]/10 text-[#5B6CFF] flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-muted">
                          {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onAdd({ id: doc.id, name: doc.name, size: doc.size })}
                      disabled={inChat || full}
                      title={inChat ? "Already in this chat" : full ? `This chat already has ${maxDocs} documents` : "Add to this chat"}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-[#5B6CFF] hover:bg-[#4a5be8] text-white text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {inChat ? "In chat" : "Add to chat"}
                    </button>
                  </div>

                  {tagsEnabled && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[#5B6CFF]/10 text-[#5B6CFF] text-[11px] font-medium"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                          <button
                            onClick={() => saveTags(doc, doc.tags.filter((t) => t !== tag))}
                            className="p-0.5 rounded-full hover:bg-[#5B6CFF]/20 cursor-pointer"
                            title={`Remove tag "${tag}"`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      {editingId === doc.id ? (
                        <input
                          autoFocus
                          value={draft}
                          maxLength={24}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitDraft(doc);
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setDraft("");
                            }
                          }}
                          onBlur={() => commitDraft(doc)}
                          placeholder="tag name"
                          className="w-24 px-2 py-0.5 rounded-full bg-card border border-[#5B6CFF] focus:outline-none text-[11px] text-foreground"
                        />
                      ) : (
                        doc.tags.length < 10 && (
                          <button
                            onClick={() => {
                              setEditingId(doc.id);
                              setDraft("");
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed border-border text-[11px] text-muted hover:text-foreground hover:border-[#5B6CFF] cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" /> tag
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
