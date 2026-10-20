"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp?: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "👋 Welcome to DocuChat AI! Upload a document (PDF, TXT, DOC, DOCX) to start asking questions about its contents.",
      sender: "ai",
      timestamp: "Just now",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || message).trim();
    if (!textToSend || loading) return;

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage: Message = {
      id: Date.now(),
      text: textToSend,
      sender: "user",
      timestamp: timeString,
    };

    setMessage("");

    if (!currentDocument) {
      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: Date.now() + 1,
          text: "⚠️ Please upload a document first before asking questions. Only PDF, TXT, DOC, and DOCX files (max 4.5 MB) are supported.",
          sender: "ai",
          timestamp: timeString,
        },
      ]);
      return;
    }

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          document: currentDocument,
          documentId: currentDocumentId,
        }),
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Server returned error (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const fullText = data.answer || "";
      const aiId = Date.now() + 1;
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { id: aiId, text: "", sender: "ai", timestamp: timeString },
      ]);

      let i = 0;
      const chunkSize = Math.max(1, Math.floor(fullText.length / 80));
      const timer = setInterval(() => {
        i += chunkSize;
        if (i >= fullText.length) {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, text: fullText } : m))
          );
          clearInterval(timer);
        } else {
          const displayed = fullText.slice(0, i);
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, text: displayed } : m))
          );
        }
      }, 16);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `❌ ${error?.message || "Sorry, I couldn't process your request. Please try again."}`,
          sender: "ai",
          timestamp: timeString,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Please upload PDF, TXT, or DOC/DOCX files only.");
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      alert("File size must be under 4.5 MB on Vercel.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Server error (${response.status}): ${raw.slice(0, 120) || "Empty response from server"}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setCurrentDocument(file.name);
      setCurrentDocumentId(data.documentId || null);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `📄 Document **"${file.name}"** uploaded & processed successfully! You can now ask questions about it below.`,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setSidebarOpen(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `❌ ${error?.message || "Failed to upload document. Please try again."}`,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this conversation?")) {
      setMessages([
        {
          id: Date.now(),
          text: currentDocument
            ? `Chat cleared. Ready for your questions about **"${currentDocument}"**.`
            : "Chat cleared. Please upload a document to get started.",
          sender: "ai",
          timestamp: "Just now",
        },
      ]);
    }
  };

  const quickPrompts = [
    "Summarize this document briefly",
    "What are the main key points?",
    "Extract important action items or dates",
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.doc,.docx"
        className="hidden"
      />

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs sm:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed sm:static inset-y-0 left-0 z-50 w-72 bg-slate-900/95 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out backdrop-blur-md ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">DocuChat AI</h1>
              <p className="text-xs text-blue-400 font-medium">Smart Document RAG</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden text-slate-400 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload Action */}
        <div className="p-4 space-y-3">
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Upload Document</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            Supports PDF, TXT, DOC, DOCX up to 4.5MB
          </p>
        </div>

        {/* Active Document Section */}
        <div className="flex-1 px-4 py-2 overflow-y-auto">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Current Document
          </div>

          {currentDocument ? (
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate" title={currentDocument}>
                    {currentDocument}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 mt-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Indexed & Ready
                  </span>
                </div>
              </div>

              <button
                onClick={handleUploadClick}
                className="w-full text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 text-left flex items-center gap-1 cursor-pointer"
              >
                <span>Switch document</span>
                <span>→</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center space-y-2 bg-slate-900/40">
              <div className="w-8 h-8 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-xs text-slate-400">No document uploaded yet</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <button
            onClick={handleClearChat}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Conversation
          </button>
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
            <span>Powered by Gemini</span>
            <span className="text-slate-400 font-mono">v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <main className="flex-1 flex flex-col bg-slate-950 relative">
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-100 text-sm sm:text-base">Document Assistant</h2>
                {currentDocument && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 max-w-[200px] truncate">
                    📄 {currentDocument}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">RAG Semantic Search & Q&A</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
              <span className={`w-2 h-2 rounded-full ${currentDocument ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span>{currentDocument ? "Document Loaded" : "Upload Required"}</span>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="max-w-md text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">How can I help you today?</h3>
                <p className="text-sm text-slate-400">
                  Upload a PDF or document, then ask specific questions or request summaries.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "bg-slate-800 text-indigo-400 border border-slate-700"
                    }`}
                  >
                    {msg.sender === "user" ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs space-y-1 ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-tr-xs"
                        : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs"
                    }`}
                  >
                    <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>
                    {msg.timestamp && (
                      <div
                        className={`text-[10px] text-right font-medium ${
                          msg.sender === "user" ? "text-blue-200/70" : "text-slate-400"
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing / Loading indicator */}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-xs px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips (when document is uploaded) */}
        {currentDocument && messages.length <= 3 && !loading && (
          <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-slate-400 shrink-0">Try asking:</span>
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(undefined, prompt)}
                  className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 py-1.5 px-3 rounded-full whitespace-nowrap transition-colors cursor-pointer"
                >
                  {prompt} →
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-slate-900 border border-slate-800 focus-within:border-blue-500/80 rounded-2xl p-1.5 shadow-lg shadow-black/20 transition-all">
              {/* Upload Paperclip Button */}
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={uploading}
                title="Upload document"
                className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  currentDocument
                    ? `Ask anything about "${currentDocument}"...`
                    : "Upload a document (PDF, TXT, DOC, DOCX) to start..."
                }
                disabled={loading}
                className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-60"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl transition-all disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <svg className="w-5 h-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pt-2">
              <span>Press Enter to send message</span>
              {currentDocument && <span className="truncate max-w-[200px]">Active: {currentDocument}</span>}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
