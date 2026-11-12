"use client";

import { useState } from "react";
import type { UploadedDoc, Conversation } from "./types";
import { MAX_DOCS } from "./types";
import { FileText, Upload, Loader2, LogOut, X, Sparkles, RotateCcw, Eye, Plus, Trash2, MessageSquare, Download, Search } from "lucide-react";

type SidebarProps = {
  user: any;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  handleNewChat: () => void;
  openFileDialog: () => void;
  uploading: boolean;
  documents: UploadedDoc[];
  handleViewDocument: (doc?: UploadedDoc, page?: number | null) => void;
  handleRemoveDocument: (id: string, name: string) => void;
  handleClearAllDocuments: () => void;
  conversations: Conversation[];
  currentConvoId: string;
  handleSelectConversation: (c: Conversation) => void;
  handleDeleteConversation: (id: string, e: React.MouseEvent) => void;
  setShowClearConfirm: (v: boolean) => void;
  setShowSignOutConfirm: (v: boolean) => void;
  canExport: boolean;
  onExportMarkdown: () => void;
  onExportPdf: () => void;
};

export function Sidebar({
  user, sidebarOpen, setSidebarOpen, handleNewChat, openFileDialog, uploading, documents, handleViewDocument, handleRemoveDocument, handleClearAllDocuments, conversations, currentConvoId, handleSelectConversation, handleDeleteConversation, setShowClearConfirm, setShowSignOutConfirm, canExport, onExportMarkdown, onExportPdf,
}: SidebarProps) {
  const [historyQuery, setHistoryQuery] = useState("");

  // Match on title or any message text; when only a message matches, show a snippet of it
  const q = historyQuery.trim().toLowerCase();
  const matches = conversations.flatMap((convo) => {
    if (!q) return [{ convo, snippet: "" }];
    if ((convo.title || "").toLowerCase().includes(q)) return [{ convo, snippet: "" }];
    const hit = convo.messages.find((m) => m.text.toLowerCase().includes(q));
    if (!hit) return [];
    const i = hit.text.toLowerCase().indexOf(q);
    return [{ convo, snippet: hit.text.slice(Math.max(0, i - 15), i + 45).replace(/\s+/g, " ") }];
  });

  return (
      <aside
        className={`fixed sm:static inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-card/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5B6CFF] flex items-center justify-center shadow-md shadow-[#5B6CFF]/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground tracking-tight">DocuChat AI</h1>
              <p className="text-xs text-muted font-medium truncate max-w-[140px]">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden text-muted hover:text-foreground p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons: New Chat & Upload */}
        <div className="p-3.5 space-y-2 border-b border-border bg-card/40">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-3 rounded-xl bg-card hover:bg-background text-foreground border border-border hover:border-[#5B6CFF]/40 font-semibold text-xs shadow-xs transition-all flex items-center justify-between cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#5B6CFF] group-hover:rotate-90 transition-transform duration-200" />
              <span>New Chat</span>
            </span>
            <span className="text-[10px] bg-surface text-muted px-1.5 py-0.5 rounded font-mono">Clean</span>
          </button>

          <button
            onClick={openFileDialog}
            disabled={uploading || documents.length >= MAX_DOCS}
            className="w-full py-2.5 px-3 rounded-xl bg-[#5B6CFF] hover:bg-[#4a5be8] text-white font-semibold text-xs shadow-md shadow-[#5B6CFF]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading files...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {documents.length >= MAX_DOCS
                    ? `Max Docs Limit (${MAX_DOCS}/${MAX_DOCS})`
                    : `Upload Files (${documents.length}/${MAX_DOCS})`}
                </span>
              </>
            )}
          </button>
          <p className="text-[10px] text-muted text-center">
            PDF, TXT, DOC, DOCX • max {MAX_DOCS} files (4.5MB ea)
          </p>
        </div>

        {/* Scrollable Middle: Documents & Chat History */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {/* Section: Uploaded Documents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Uploaded Files ({documents.length}/{MAX_DOCS})
              </span>
              {documents.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllDocuments}
                  className="text-[10px] text-red-600 hover:text-red-700 hover:underline font-semibold cursor-pointer"
                  title="Clear all uploaded documents"
                >
                  Clear all
                </button>
              )}
            </div>

            {documents.length > 0 ? (
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-xl bg-card border border-border shadow-xs flex items-center justify-between gap-2 hover:border-[#5B6CFF]/30 transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-[#5B6CFF]/10 text-[#5B6CFF] flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Ready
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        className="p-1 text-[#5B6CFF] hover:bg-[#5B6CFF]/10 rounded-md transition-colors cursor-pointer"
                        title="View document preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id, doc.name)}
                        className="p-1 text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Remove this document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={openFileDialog}
                className="p-3 rounded-xl border border-dashed border-border text-center space-y-1 bg-card/60 hover:bg-card hover:border-[#5B6CFF]/40 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-surface flex items-center justify-center text-muted">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-medium text-foreground">No files attached</p>
                <p className="text-[10px] text-muted">General chat mode. Click to attach up to {MAX_DOCS} files.</p>
              </div>
            )}
          </div>

          {/* Section: Chat History */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Chat History ({conversations.length})
              </span>
            </div>

            {conversations.length > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-card border border-border focus:border-[#5B6CFF] focus:outline-none text-xs text-foreground placeholder-muted"
                />
                {historyQuery && (
                  <button
                    type="button"
                    onClick={() => setHistoryQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-muted hover:text-foreground cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {conversations.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px] text-muted bg-card/40 rounded-xl border border-dashed border-border">
                No previous conversations
              </div>
            ) : matches.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px] text-muted bg-card/40 rounded-xl border border-dashed border-border">
                No chats match &quot;{historyQuery}&quot;
              </div>
            ) : (
              <div className="space-y-1">
                {matches.map(({ convo, snippet }) => (
                  <div
                    key={convo.id}
                    onClick={() => handleSelectConversation(convo)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer group ${
                      currentConvoId === convo.id
                        ? "bg-card border border-[#5B6CFF]/30 text-foreground shadow-xs font-semibold"
                        : "hover:bg-card/70 text-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          currentConvoId === convo.id ? "text-[#5B6CFF]" : "text-muted"
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="block truncate">{convo.title || "Conversation"}</span>
                        {snippet && <span className="block truncate text-[10px] font-normal text-muted">{snippet}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(convo.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-600 rounded-md hover:bg-red-50 transition-all cursor-pointer shrink-0"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-border space-y-1.5 bg-card/50">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onExportMarkdown}
              disabled={!canExport}
              title="Download this chat as a Markdown file"
              className="py-2 px-2 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-card transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Markdown
            </button>
            <button
              onClick={onExportPdf}
              disabled={!canExport}
              title="Save this chat as PDF (opens the print dialog)"
              className="py-2 px-2 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-card transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-card transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Current Messages
          </button>

          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
  );
}
