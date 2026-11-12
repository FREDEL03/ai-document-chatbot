"use client";

import { useState, useEffect } from "react";
import type { UploadedDoc } from "./types";
import { FileViewer } from "@/app/components/FileViewer";
import { authFetch } from "@/src/lib/auth-fetch";
import { FileText, Loader2, ExternalLink, X, AlertTriangle, Eye, Download, Search } from "lucide-react";

type DocModalProps = {
  documents: UploadedDoc[];
  currentDocument: string | null;
  docUrl: string | null;
  docPage: number | null;
  docText: string | null;
  docLoading: boolean;
  docModalTab: "visual" | "text";
  setDocModalTab: (v: "visual" | "text") => void;
  setShowDocModal: (v: boolean) => void;
  handleViewDocument: (doc?: UploadedDoc, page?: number | null) => void;
  onGoToPage: (page: number | null) => void;
};

type SearchResult = { page: number | null; snippet: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function DocModal({
  documents, currentDocument, docUrl, docPage, docText, docLoading, docModalTab, setDocModalTab, setShowDocModal, handleViewDocument, onGoToPage,
}: DocModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const docId = documents.find((d) => d.name === currentDocument)?.id;

  // Switching to another document makes the old results meaningless
  useEffect(() => {
    setResults(null);
    setSearchError("");
  }, [docId]);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!docId || q.length < 2) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await authFetch("/api/doc-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results);
    } catch (err: any) {
      setResults(null);
      setSearchError(err?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const highlight = (text: string) =>
    query.trim().length < 2 ? text : text.split(new RegExp(`(${escapeRe(query.trim())})`, "i")).map((part, i) =>
      i % 2 === 1 ? (
        <mark key={i} className="bg-yellow-200 text-inherit rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2B2B2E]/40 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[92vh] bg-white border border-[#E4E2DE] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#E4E2DE] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#5B6CFF]/10 text-[#5B6CFF] flex items-center justify-center shrink-0 border border-[#5B6CFF]/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  {documents.length > 1 ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={currentDocument || ""}
                        onChange={(e) => {
                          const selected = documents.find((d) => d.name === e.target.value);
                          if (selected) handleViewDocument(selected);
                        }}
                        className="text-xs sm:text-sm font-semibold text-[#2B2B2E] bg-[#F3F2F0] hover:bg-[#E4E2DE] border border-[#E4E2DE] rounded-xl px-2.5 py-1 cursor-pointer focus:outline-none max-w-[260px] truncate"
                      >
                        {documents.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <h3 className="text-sm sm:text-base font-semibold text-[#2B2B2E] truncate" title={currentDocument || "Document"}>
                      {currentDocument || "Uploaded Document"}
                    </h3>
                  )}
                  <p className="text-[11px] text-[#6B6B73]">Visual document viewer</p>
                </div>
              </div>

              {/* View Toggle Tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#F3F2F0] rounded-xl border border-[#E4E2DE]">
                <button
                  type="button"
                  onClick={() => setDocModalTab("visual")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    docModalTab === "visual"
                      ? "bg-white text-[#2B2B2E] shadow-xs"
                      : "text-[#6B6B73] hover:text-[#2B2B2E]"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visual View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocModalTab("text")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    docModalTab === "text"
                      ? "bg-white text-[#2B2B2E] shadow-xs"
                      : "text-[#6B6B73] hover:text-[#2B2B2E]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Extracted Text</span>
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {docUrl && (
                  <>
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3F2F0] hover:bg-[#E4E2DE] text-xs font-medium text-[#2B2B2E] transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </a>
                    <a
                      href={docUrl}
                      download={currentDocument || "document"}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3F2F0] hover:bg-[#E4E2DE] text-xs font-medium text-[#2B2B2E] transition-colors"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </>
                )}
                <button
                  onClick={() => setShowDocModal(false)}
                  className="p-2 text-[#6B6B73] hover:text-[#2B2B2E] rounded-xl hover:bg-[#F3F2F0] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search inside this document */}
            {docId && (
              <div className="pt-3 shrink-0">
                <form onSubmit={runSearch} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B73]" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search in this document..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#FAFAF9] border border-[#E4E2DE] focus:border-[#5B6CFF] focus:outline-none text-xs text-[#2B2B2E] placeholder-[#6B6B73]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching || query.trim().length < 2}
                    className="px-3 py-1.5 rounded-xl bg-[#5B6CFF] hover:bg-[#4a5be8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    {searching && <Loader2 className="w-3 h-3 animate-spin" />}
                    Search
                  </button>
                </form>
                {searchError && <p className="text-[11px] text-red-600 pt-1.5">{searchError}</p>}
                {results && (
                  <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-[#E4E2DE] bg-white divide-y divide-[#E4E2DE]/70">
                    {results.length === 0 ? (
                      <p className="p-2.5 text-[11px] text-[#6B6B73]">No matches for &quot;{query.trim()}&quot;.</p>
                    ) : (
                      results.map((r, i) => {
                        const body = (
                          <>
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#5B6CFF]/10 text-[#5B6CFF] text-[10px] font-semibold">
                              {r.page ? `p.${r.page}` : "—"}
                            </span>
                            <span className="text-[11px] text-[#2B2B2E] leading-snug">{highlight(r.snippet)}</span>
                          </>
                        );
                        return r.page ? (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setDocModalTab("visual");
                              onGoToPage(r.page);
                            }}
                            className="w-full flex items-start gap-2 p-2 text-left hover:bg-[#F3F2F0] cursor-pointer"
                            title={`Go to page ${r.page}`}
                          >
                            {body}
                          </button>
                        ) : (
                          <div key={i} className="flex items-start gap-2 p-2">
                            {body}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 my-3 overflow-hidden rounded-2xl bg-[#FAFAF9] border border-[#E4E2DE] flex flex-col">
              {docLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#6B6B73]">
                  <Loader2 className="w-7 h-7 text-[#5B6CFF] animate-spin" />
                  <span className="font-sans text-xs font-medium">Loading document viewer...</span>
                </div>
              ) : docModalTab === "visual" ? (
                currentDocument?.toLowerCase().endsWith(".pdf") ? (
                  docUrl ? (
                    <object
                      key={`${docUrl}#${docPage}`}
                      data={`${docUrl}#${docPage ? `page=${docPage}&` : ""}toolbar=1&navpanes=0`}
                      type="application/pdf"
                      className="w-full h-full rounded-2xl"
                    >
                      <iframe
                        src={`${docUrl}#${docPage ? `page=${docPage}&` : ""}toolbar=1`}
                        className="w-full h-full rounded-2xl border-0"
                        title="PDF Visual Preview"
                      />
                    </object>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#6B6B73] gap-3">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                      <div>
                        <p className="text-sm font-semibold text-[#2B2B2E]">Unable to generate visual PDF link</p>
                        <p className="text-xs text-[#6B6B73] mt-1">Please try re-opening or check the extracted text tab.</p>
                      </div>
                      <button
                        onClick={() => handleViewDocument()}
                        className="px-3 py-1.5 rounded-xl bg-[#5B6CFF] text-white text-xs font-medium hover:bg-[#4a5be8] cursor-pointer"
                      >
                        Retry Loading PDF
                      </button>
                    </div>
                  )
                ) : docUrl && (currentDocument?.toLowerCase().endsWith(".png") || currentDocument?.toLowerCase().endsWith(".jpg") || currentDocument?.toLowerCase().endsWith(".jpeg") || currentDocument?.toLowerCase().endsWith(".webp")) ? (
                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                    <img src={docUrl} alt="Document" className="max-w-full max-h-full rounded-lg object-contain shadow-sm" />
                  </div>
                ) : docUrl && /\.(txt|docx?)$/i.test(currentDocument || "") ? (
                  <FileViewer key={docUrl} url={docUrl} name={currentDocument!} fallbackText={docText} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#6B6B73] text-xs">
                    Preview not available for this file type.
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 bg-amber-50/80 border-b border-amber-200/60 text-[11px] text-amber-800 flex items-center justify-between">
                    <span>Parsed text representation used by AI indexing:</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-[#2B2B2E] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono select-text bg-white">
                    {docText || "No text available for this document."}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-[#6B6B73] shrink-0">
              <span className="truncate max-w-[250px]">{currentDocument}</span>
              <button
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 rounded-xl bg-[#5B6CFF] hover:bg-[#4a5be8] text-white font-medium transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
  );
}
