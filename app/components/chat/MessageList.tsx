"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import type { Message, UploadedDoc } from "./types";
import { markdownComponents } from "./markdown";
import { FileText, Loader2, Sparkles, Copy, Check, Zap, Pencil, RotateCw } from "lucide-react";

type MessageListProps = {
  messages: Message[];
  loading: boolean;
  documents: UploadedDoc[];
  handleViewDocument: (doc?: UploadedDoc, page?: number | null) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  generating: boolean;
  onRegenerate: () => void;
  onEditLast: () => void;
};

export function MessageList({
  messages, loading, documents, handleViewDocument, messagesEndRef, generating, onRegenerate, onEditLast,
}: MessageListProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Only the last question can be edited, and only the answer right after it can be regenerated
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === "user") {
      lastUserIdx = i;
      break;
    }
  }

  return (
        <div id="chat-messages" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="max-w-md text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#5B6CFF]/10 border border-[#5B6CFF]/20 flex items-center justify-center text-[#5B6CFF]">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground">How can I help you today?</h3>
                <p className="text-sm text-muted">
                  Upload a PDF or document, then ask specific questions or request summaries.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 sm:gap-3 ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                      msg.sender === "user"
                        ? "bg-[#5B6CFF] text-white shadow-sm"
                        : "bg-card text-[#5B6CFF] border border-border shadow-xs"
                    }`}
                  >
                    {msg.sender === "user" ? "U" : <Sparkles className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  {msg.sender === "user" ? (
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-xs bg-[#5B6CFF] text-white">
                      <p className="text-sm sm:text-[14.5px] leading-relaxed whitespace-pre-wrap font-normal">
                        {msg.text}
                      </p>
                      {msg.timestamp && (
                        <div className="text-[10px] text-right font-medium text-white/80 pt-1">
                          {msg.timestamp}
                        </div>
                      )}
                      {idx === lastUserIdx && !generating && (
                        <div data-no-export className="flex justify-end pt-0.5">
                          <button
                            type="button"
                            onClick={onEditLast}
                            className="inline-flex items-center gap-1 text-[11px] text-white/80 hover:text-white cursor-pointer"
                            title="Edit this question"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-[92%] sm:max-w-[85%] bg-card border border-border rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs space-y-2 text-foreground">
                      {/* AI Header Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-border/70 text-xs">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#5B6CFF]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5B6CFF]" />
                          <span>DocuChat AI</span>
                          {msg.cached && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 border border-amber-500/25">
                              <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                              Cached
                            </span>
                          )}
                        </div>
                        <div data-no-export className="flex items-center gap-1">
                        {idx === messages.length - 1 && idx > lastUserIdx && lastUserIdx >= 0 && !generating && (
                          <button
                            type="button"
                            onClick={onRegenerate}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-surface text-[11px] text-muted hover:text-foreground transition-colors cursor-pointer"
                            title="Regenerate response"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Regenerate</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            setCopiedId(msg.id);
                            toast.success("Response copied to clipboard");
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-surface text-[11px] text-muted hover:text-foreground transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        </div>
                      </div>

                      {/* Rendered AI Markdown Content */}
                      <div className="text-sm leading-relaxed overflow-hidden">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>

                      {/* Source citations: click to open the document at that page */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-medium text-muted">Sources:</span>
                          {msg.sources.map((s, i) => {
                            const doc = documents.find((d) => d.id === s.d);
                            if (!doc) return null;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleViewDocument(doc, s.p)}
                                className="inline-flex items-center gap-1 max-w-[220px] px-2 py-0.5 rounded-md border border-border bg-background hover:bg-surface text-[11px] text-[#5B6CFF] cursor-pointer"
                                title={s.p ? `${doc.name} — page ${s.p}` : doc.name}
                              >
                                <FileText className="w-3 h-3 shrink-0" />
                                <span className="truncate">{doc.name}{s.p ? ` · p.${s.p}` : ""}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {msg.timestamp && (
                        <div className="text-[10px] text-right font-medium text-muted pt-1 border-t border-border/40">
                          {msg.timestamp}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div data-no-export className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-card text-[#5B6CFF] border border-border flex items-center justify-center shrink-0 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#5B6CFF]" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#5B6CFF] animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-[#5B6CFF] animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-[#5B6CFF] animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
  );
}
