"use client";

import { useState, useRef } from "react";

type Message = {
  id: number;
  text: string;
  sender: "user" | "ai";
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! I'm DocuChat AI. Ask me anything.", sender: "ai" },
  ]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    // Add user message
    const userMessage: Message = { id: Date.now(), text: trimmed, sender: "user" };
    setMessages([...messages, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          document: currentDocument,
          documentId: currentDocumentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      // Typewriter AI response
      const fullText = data.answer || "";
      const aiId = Date.now() + 1;
      setLoading(false);
      setMessages(prev => [...prev, { id: aiId, text: "", sender: "ai" }]);

      let i = 0;
      const chunkSize = Math.max(1, Math.floor(fullText.length / 100));
      const timer = setInterval(() => {
        i += chunkSize;
        if (i >= fullText.length) {
          setMessages(prev =>
            prev.map(m => (m.id === aiId ? { ...m, text: fullText } : m))
          );
          clearInterval(timer);
        } else {
          const displayed = fullText.slice(0, i);
          setMessages(prev =>
            prev.map(m => (m.id === aiId ? { ...m, text: displayed } : m))
          );
        }
      }, 15);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "Sorry, I couldn't process your request. Please try again.",
        sender: "ai",
      };
      setMessages(prev => [...prev, errorMessage]);
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

    // Basic validation
    const validTypes = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload PDF, TXT, or DOC/DOCX files only.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10 MB
      alert("File size must be less than 10 MB.");
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Set current document
      setCurrentDocument(file.name);
      setCurrentDocumentId(data.documentId || null);

      // Add success message
      const uploadMessage: Message = {
        id: Date.now(),
        text: `✅ Document "${file.name}" uploaded successfully. You can now ask questions about it.`,
        sender: "ai",
      };
      setMessages(prev => [...prev, uploadMessage]);
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage: Message = {
        id: Date.now(),
        text: `❌ ${error?.message || "Failed to upload document. Please try again."}`,
        sender: "ai",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden sm:flex flex-col w-64 bg-slate-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8">DocuChat AI</h1>

        <button
          onClick={handleUploadClick}
          disabled={uploading}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </>
          ) : (
            "+ Upload Document"
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.doc,.docx"
          className="hidden"
        />

        {currentDocument && (
          <div className="mt-4 p-3 bg-slate-800 rounded-lg">
            <p className="text-slate-300 text-sm font-medium">Current Document:</p>
            <p className="text-white text-sm truncate">{currentDocument}</p>
          </div>
        )}
        <p className="text-slate-400 text-sm mt-4">
          Powered by Gemini 2.5 Flash
        </p>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-semibold">Chat</h2>
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
            AI Live
          </span>
        </div>

        {/* Messages area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-slate-800 mb-2">
                  How can I help you?
                </h3>
                <p className="text-slate-600">Send a message to start the conversation.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-2xl rounded-bl-none">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={!message.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
