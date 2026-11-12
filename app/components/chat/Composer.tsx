"use client";

import type { Message, UploadedDoc } from "./types";
import { MAX_DOCS } from "./types";
import { Send, Paperclip, Square } from "lucide-react";

type ComposerProps = {
  messages: Message[];
  documents: UploadedDoc[];
  generating: boolean;
  onStop: () => void;
  uploading: boolean;
  message: string;
  setMessage: (v: string) => void;
  currentDocument: string | null;
  openFileDialog: () => void;
  handleSend: (e?: React.SyntheticEvent, customText?: string) => void;
};

export function Composer({
  messages, documents, generating, onStop, uploading, message, setMessage, currentDocument, openFileDialog, handleSend,
}: ComposerProps) {
  // Prefer questions generated from the documents; fall back to generic ones
  const suggested = documents.flatMap((d) => d.questions ?? []).slice(0, 3);
  const quickPrompts = suggested.length
    ? suggested
    : [
        "Summarize this document briefly",
        "What are the main key points?",
        "Extract important action items or dates",
      ];

  return (
<>
        {documents.length > 0 && !messages.some((m) => m.sender === "user") && !generating && (
          <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full pb-2">
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-xs text-muted shrink-0">Try asking:</span>
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(undefined, prompt)}
                  className="text-xs bg-card hover:bg-surface border border-border hover:border-[#5B6CFF]/40 text-foreground py-1.5 px-3 rounded-full text-left transition-colors cursor-pointer shadow-xs"
                >
                  {prompt} →
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 sm:p-5 border-t border-border bg-card/80 backdrop-blur-md">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-background border border-border focus-within:border-[#5B6CFF] rounded-2xl p-1.5 shadow-sm transition-all">
              <button
                type="button"
                onClick={openFileDialog}
                disabled={uploading || documents.length >= MAX_DOCS}
                title={documents.length >= MAX_DOCS ? `Limit reached (${MAX_DOCS}/${MAX_DOCS})` : "Attach document"}
                className="p-2.5 text-muted hover:text-[#5B6CFF] hover:bg-card rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  documents.length === 1
                    ? `Ask anything about "${documents[0].name}"...`
                    : documents.length > 1
                    ? `Ask across your ${documents.length} attached documents...`
                    : "Message DocuChat AI or upload a document to get started..."
                }
                disabled={generating}
                className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-foreground placeholder-muted focus:outline-none disabled:opacity-60"
              />

              {generating ? (
                <button
                  type="button"
                  onClick={onStop}
                  title="Stop generating"
                  className="p-2.5 bg-[#2B2B2E] hover:bg-black text-white rounded-xl transition-all cursor-pointer shrink-0"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="p-2.5 bg-[#5B6CFF] hover:bg-[#4a5be8] disabled:bg-border text-white disabled:text-muted rounded-xl transition-all disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted px-2 pt-2">
              <span>Press Enter to send • Drag & drop anywhere</span>
              {currentDocument && <span className="truncate max-w-[200px]">Active: {currentDocument}</span>}
            </div>
          </form>
        </div>
</>
  );
}
