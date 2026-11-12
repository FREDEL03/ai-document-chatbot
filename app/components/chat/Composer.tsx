"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Message, UploadedDoc, Lang } from "./types";
import { MAX_DOCS } from "./types";
import { Send, Paperclip, Square, Mic } from "lucide-react";

// Speech recognition language for each answer-language setting ("auto" follows the browser's language)
const speechLang = (lang: Lang) => (lang === "fil" ? "fil-PH" : lang === "en" ? "en-US" : navigator.language || "en-US");

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's site settings.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser's site settings.",
  "no-speech": "I didn't hear anything. Try again.",
  "audio-capture": "No microphone found.",
  network: "Voice input needs an internet connection.",
  "language-not-supported": "Your browser doesn't support voice input in this language.",
};

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
  language: Lang;
};

export function Composer({
  messages, documents, generating, onStop, uploading, message, setMessage, currentDocument, openFileDialog, handleSend, language,
}: ComposerProps) {
  // Voice input via the browser's Web Speech API (Chrome/Edge/Safari; not Firefox)
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    setMicSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.abort();
  }, []);

  // Stop listening once a message is on its way
  useEffect(() => {
    if (generating) recRef.current?.stop();
  }, [generating]);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = speechLang(language);
    rec.interimResults = true;
    rec.continuous = false;
    // Keep what's already typed and append the spoken words after it
    const base = message && !message.endsWith(" ") ? message + " " : message;
    rec.onresult = (e: any) => {
      const spoken = Array.from(e.results as ArrayLike<any>)
        .map((r) => r[0].transcript)
        .join("");
      setMessage(base + spoken);
    };
    rec.onerror = (e: any) => toast.error(MIC_ERRORS[e.error] || "Voice input failed. Please try again.");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

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

              {micSupported && !generating && (
                <button
                  type="button"
                  onClick={toggleMic}
                  title={listening ? "Stop listening" : "Speak your question"}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                    listening ? "bg-red-500 text-white animate-pulse" : "text-muted hover:text-[#5B6CFF] hover:bg-card"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}

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
