"use client";

import type { UploadedDoc, Conversation } from "./types";
import { MAX_DOCS } from "./types";
import { FileText, Upload, Loader2, LogOut, X, Sparkles, RotateCcw, Eye, Plus, Trash2, MessageSquare } from "lucide-react";

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
};

export function Sidebar({
  user, sidebarOpen, setSidebarOpen, handleNewChat, openFileDialog, uploading, documents, handleViewDocument, handleRemoveDocument, handleClearAllDocuments, conversations, currentConvoId, handleSelectConversation, handleDeleteConversation, setShowClearConfirm, setShowSignOutConfirm,
}: SidebarProps) {
  return (
      <aside
        className={`fixed sm:static inset-y-0 left-0 z-50 w-72 bg-[#F3F2F0] border-r border-[#E4E2DE] flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-5 border-b border-[#E4E2DE] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5B6CFF] flex items-center justify-center shadow-md shadow-[#5B6CFF]/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-[#2B2B2E] tracking-tight">DocuChat AI</h1>
              <p className="text-xs text-[#6B6B73] font-medium truncate max-w-[140px]">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden text-[#6B6B73] hover:text-[#2B2B2E] p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons: New Chat & Upload */}
        <div className="p-3.5 space-y-2 border-b border-[#E4E2DE] bg-white/40">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#FAFAF9] text-[#2B2B2E] border border-[#E4E2DE] hover:border-[#5B6CFF]/40 font-semibold text-xs shadow-xs transition-all flex items-center justify-between cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#5B6CFF] group-hover:rotate-90 transition-transform duration-200" />
              <span>New Chat</span>
            </span>
            <span className="text-[10px] bg-[#F3F2F0] text-[#6B6B73] px-1.5 py-0.5 rounded font-mono">Clean</span>
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
          <p className="text-[10px] text-[#6B6B73] text-center">
            PDF, TXT, DOC, DOCX • max {MAX_DOCS} files (4.5MB ea)
          </p>
        </div>

        {/* Scrollable Middle: Documents & Chat History */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {/* Section: Uploaded Documents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B73]">
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
                    className="p-2.5 rounded-xl bg-white border border-[#E4E2DE] shadow-xs flex items-center justify-between gap-2 hover:border-[#5B6CFF]/30 transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-[#5B6CFF]/10 text-[#5B6CFF] flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#2B2B2E] truncate" title={doc.name}>
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
                        className="p-1 text-[#6B6B73] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
                className="p-3 rounded-xl border border-dashed border-[#E4E2DE] text-center space-y-1 bg-white/60 hover:bg-white hover:border-[#5B6CFF]/40 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-[#F3F2F0] flex items-center justify-center text-[#6B6B73]">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-medium text-[#2B2B2E]">No files attached</p>
                <p className="text-[10px] text-[#6B6B73]">General chat mode. Click to attach up to {MAX_DOCS} files.</p>
              </div>
            )}
          </div>

          {/* Section: Chat History */}
          <div className="space-y-2 pt-2 border-t border-[#E4E2DE]">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B73]">
                Chat History ({conversations.length})
              </span>
            </div>

            {conversations.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px] text-[#6B6B73] bg-white/40 rounded-xl border border-dashed border-[#E4E2DE]">
                No previous conversations
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((convo) => (
                  <div
                    key={convo.id}
                    onClick={() => handleSelectConversation(convo)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer group ${
                      currentConvoId === convo.id
                        ? "bg-white border border-[#5B6CFF]/30 text-[#2B2B2E] shadow-xs font-semibold"
                        : "hover:bg-white/70 text-[#6B6B73] hover:text-[#2B2B2E]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          currentConvoId === convo.id ? "text-[#5B6CFF]" : "text-[#6B6B73]"
                        }`}
                      />
                      <span className="truncate">{convo.title || "Conversation"}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(convo.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#6B6B73] hover:text-red-600 rounded-md hover:bg-red-50 transition-all cursor-pointer shrink-0"
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
        <div className="p-3.5 border-t border-[#E4E2DE] space-y-1.5 bg-white/50">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[#6B6B73] hover:text-[#2B2B2E] hover:bg-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
