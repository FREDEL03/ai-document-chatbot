"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Message, UploadedDoc, Lang } from "./types";
import { MAX_DOCS } from "./types";
import { Send, Paperclip, Square, Mic, Loader2 } from "lucide-react";
import { authFetch } from "@/src/lib/auth-fetch";
import { startRecorder } from "@/src/lib/record-audio";

// Speech recognition language for each answer-language setting ("auto" follows the browser's language)
const speechLang = (lang: Lang) => (lang === "fil" ? "fil-PH" : lang === "en" ? "en-US" : navigator.language || "en-US");

// Can this browser record audio (for the server-side transcription fallback)?
const canRecord = () => !!navigator.mediaDevices && "MediaRecorder" in window;

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's site settings.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser's site settings.",
  "no-speech": "I didn't hear anything. Try again.",
  "audio-capture": "No microphone found.",
  network: "Voice input isn't available right now. Please try again.",
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
  // Voice input. Two modes:
  //  "native": the browser's Web Speech API (live text; Chrome/Edge/Safari)
  //  "record": record audio, transcribe on the server. Used when native is missing or its speech
  //            service fails (Brave, Firefox, blocked Google speech service => "network" error).
  const [micSupported, setMicSupported] = useState(false);
  const [mode, setMode] = useState<"native" | "record">("native");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recRef = useRef<any>(null); // native SpeechRecognition
  const recorderRef = useRef<Awaited<ReturnType<typeof startRecorder>> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRef = useRef(message);
  useEffect(() => {
    messageRef.current = message;
  });

  useEffect(() => {
    const w = window as any;
    const hasNative = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("docuchat_voice");
    } catch {}
    setMicSupported(hasNative || canRecord());
    setMode(hasNative && saved !== "record" ? "native" : "record");
    return () => {
      recRef.current?.abort();
      recorderRef.current?.cancel();
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
  }, []);

  // Append spoken words after whatever is already typed
  const appendSpoken = (spoken: string) => {
    const cur = messageRef.current;
    setMessage((cur && !cur.endsWith(" ") ? cur + " " : cur) + spoken);
  };

  const startRecording = async () => {
    try {
      recorderRef.current = await startRecorder();
      setListening(true);
      autoStopRef.current = setTimeout(stopRecording, 60_000); // keeps the upload small
    } catch {
      toast.error("Couldn't access the microphone. Allow it in your browser's site settings.");
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    setListening(false);
    setTranscribing(true);
    try {
      const wav = await recorder.stop();
      const form = new FormData();
      form.append("audio", wav, "voice.wav");
      form.append("language", language);
      const res = await authFetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      if (data.text) appendSpoken(data.text);
      else toast.info("I didn't hear anything. Try again.");
    } catch (err: any) {
      toast.error(err?.message || "Voice input failed. Please try again.");
    } finally {
      setTranscribing(false);
    }
  };

  // Stop listening once a message is on its way
  useEffect(() => {
    if (generating) {
      recRef.current?.stop();
      stopRecording();
    }
  }, [generating]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNative = () => {
    const w = window as any;
    const rec = new (w.SpeechRecognition || w.webkitSpeechRecognition)();
    rec.lang = speechLang(language);
    rec.interimResults = true;
    rec.continuous = false;
    const base = messageRef.current && !messageRef.current.endsWith(" ") ? messageRef.current + " " : messageRef.current;
    let switchedToRecording = false;
    rec.onresult = (e: any) => {
      const spoken = Array.from(e.results as ArrayLike<any>)
        .map((r) => r[0].transcript)
        .join("");
      setMessage(base + spoken);
    };
    rec.onerror = (e: any) => {
      if (e.error === "network" && canRecord()) {
        // The browser's speech service is unreachable: remember that and record + transcribe on the server instead
        switchedToRecording = true;
        setMode("record");
        try {
          localStorage.setItem("docuchat_voice", "record");
        } catch {}
        toast.info("Your browser's speech service isn't available, so I'll record and transcribe instead.");
        startRecording();
      } else {
        toast.error(MIC_ERRORS[e.error] || "Voice input failed. Please try again.");
      }
    };
    rec.onend = () => {
      if (!switchedToRecording) setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const toggleMic = () => {
    if (transcribing) return;
    if (listening) {
      if (mode === "native") recRef.current?.stop();
      else stopRecording();
      return;
    }
    if (mode === "native") startNative();
    else startRecording();
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
                  disabled={transcribing}
                  title={
                    transcribing ? "Transcribing..." : listening ? (mode === "record" ? "Tap to stop and transcribe" : "Stop listening") : "Speak your question"
                  }
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 disabled:cursor-wait ${
                    listening ? "bg-red-500 text-white animate-pulse" : "text-muted hover:text-[#5B6CFF] hover:bg-card"
                  }`}
                >
                  {transcribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
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
