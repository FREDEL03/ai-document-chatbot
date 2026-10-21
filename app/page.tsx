"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Send,
  Loader2,
  LogOut,
  ExternalLink,
  Menu,
  X,
  FileCheck2,
  Sparkles,
  Paperclip,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase-client";
import { LandingPage } from "@/app/components/LandingPage";
import { AuthModal } from "@/app/components/AuthModal";

type Message = {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp?: string;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "👋 Hello! I'm DocuChat AI. You can chat with me freely, or upload a document (PDF, TXT, DOC, DOCX) to ask questions about its content.",
      sender: "ai",
      timestamp: "Just now",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [showDocModal, setShowDocModal] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docText, setDocText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Check active Supabase auth session
  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      supabase.auth.getUser().then(({ data }: { data: any }) => {
        const u = data?.user ?? null;
        setUser(u);
        setAuthChecking(false);
        if (u?.id) {
          try {
            const savedDoc = localStorage.getItem(`docuchat_doc_${u.id}`);
            const savedDocId = localStorage.getItem(`docuchat_doc_id_${u.id}`);
            const savedMsgs = localStorage.getItem(`docuchat_msgs_${u.id}`);
            if (savedDoc) setCurrentDocument(savedDoc);
            if (savedDocId) setCurrentDocumentId(savedDocId);
            if (savedMsgs) {
              const parsed = JSON.parse(savedMsgs);
              if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
            }
          } catch {}
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        const u = session?.user ?? null;
        setUser(u);
        if (!u) {
          setCurrentDocument(null);
          setCurrentDocumentId(null);
        }
      });

      return () => {
        listener?.subscription?.unsubscribe();
      };
    } catch {
      setAuthChecking(false);
    }
  }, []);

  // Save conversation and active document to localStorage
  useEffect(() => {
    if (!user?.id || authChecking) return;
    try {
      localStorage.setItem(`docuchat_msgs_${user.id}`, JSON.stringify(messages));
      if (currentDocument) {
        localStorage.setItem(`docuchat_doc_${user.id}`, currentDocument);
      }
      if (currentDocumentId) {
        localStorage.setItem(`docuchat_doc_id_${user.id}`, currentDocumentId);
      }
    } catch {}
  }, [messages, currentDocument, currentDocumentId, user?.id, authChecking]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (user) {
      scrollToBottom();
    }
  }, [messages, loading, user]);

  const handleSend = async (e?: React.SyntheticEvent, customText?: string) => {
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
          userId: user?.id,
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
      toast.error(error?.message || "Failed to process chat");
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

  const uploadFile = async (file: File) => {
    if (file.size > 4.5 * 1024 * 1024) {
      toast.error("File size must be under 4.5 MB.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading and indexing "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (user?.id) {
        formData.append("userId", user.id);
      }

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

      toast.success(`"${file.name}" ready for chat!`, { id: toastId });

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
      toast.error(error?.message || "Failed to upload document", { id: toastId });
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
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0]);
    }
  }, [user?.id]);

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  });

  const handleClearChat = () => {
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
    setShowClearConfirm(false);
    toast.info("Conversation cleared");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      if (user?.id) {
        try {
          localStorage.removeItem(`docuchat_msgs_${user.id}`);
          localStorage.removeItem(`docuchat_doc_${user.id}`);
          localStorage.removeItem(`docuchat_doc_id_${user.id}`);
        } catch {}
      }
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setUser(null);
      setCurrentDocument(null);
      setCurrentDocumentId(null);
      setShowSignOutConfirm(false);
      toast.success("Signed out successfully");
    } finally {
      setSigningOut(false);
    }
  };

  const handleViewDocument = async () => {
    if (!currentDocument && !currentDocumentId) return;
    setShowDocModal(true);
    setDocLoading(true);
    setDocUrl(null);
    setDocText(null);
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from("documents").select("storage_path, extracted_text, id");
      if (currentDocumentId) {
        query = query.eq("id", currentDocumentId);
      } else if (currentDocument) {
        query = query.eq("original_name", currentDocument);
        if (user?.id) query = query.eq("user_id", user.id);
      }
      const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data?.storage_path) {
        const { data: urlData, error: urlError } = await supabase.storage.from("documents").createSignedUrl(data.storage_path, 3600);
        if (!urlError && urlData?.signedUrl) {
          setDocUrl(urlData.signedUrl);
        } else {
          setDocUrl(null);
        }
      }
      setDocText(data?.extracted_text || null);
    } catch {
      setDocText("Failed to load document content.");
      toast.error("Failed to load document content");
    } finally {
      setDocLoading(false);
    }
  };

  const quickPrompts = [
    "Summarize this document briefly",
    "What are the main key points?",
    "Extract important action items or dates",
  ];

  if (authChecking) {
    return (
      <div className="h-screen bg-[#FAFAF9] flex items-center justify-center text-[#6B6B73]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#5B6CFF] animate-spin" />
          <span className="text-sm font-medium">Loading DocuChat AI...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage
          onGetStarted={() => {
            setAuthMode("register");
            setShowAuthModal(true);
          }}
          onLoginClick={() => {
            setAuthMode("login");
            setShowAuthModal(true);
          }}
        />
        <AuthModal
          isOpen={showAuthModal}
          initialMode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setShowAuthModal(false);
          }}
        />
      </>
    );
  }

  return (
    <div
      {...getRootProps()}
      className="flex h-screen bg-[#FAFAF9] text-[#2B2B2E] overflow-hidden font-sans relative"
    >
      <input {...getInputProps()} />

      {/* Drag & Drop Visual Overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-[#E8EAFF]/90 backdrop-blur-sm border-2 border-dashed border-[#5B6CFF] flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl bg-[#5B6CFF]/15 border border-[#5B6CFF]/30 text-[#5B6CFF] mb-3 animate-bounce">
            <Upload className="w-10 h-10" />
          </div>
          <p className="text-xl font-bold text-[#2B2B2E]">Drop your document here</p>
          <p className="text-xs text-[#6B6B73] mt-1">PDF, TXT, DOC, DOCX up to 4.5MB</p>
        </div>
      )}

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-[#2B2B2E]/40 z-40 backdrop-blur-xs sm:hidden"
        />
      )}

      {/* Sidebar */}
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

        {/* Upload Action */}
        <div className="p-4 space-y-3">
          <button
            onClick={openFileDialog}
            disabled={uploading}
            className="w-full py-3 px-4 rounded-xl bg-[#5B6CFF] hover:bg-[#4a5be8] text-white font-semibold shadow-md shadow-[#5B6CFF]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload Document</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-[#6B6B73] text-center">
            Supports PDF, TXT, DOC, DOCX up to 4.5MB
          </p>
        </div>

        {/* Active Document Section */}
        <div className="flex-1 px-4 py-2 overflow-y-auto">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6B6B73] mb-2 px-1">
            Current Document
          </div>

          {currentDocument ? (
            <div className="p-3.5 rounded-xl bg-white border border-[#E4E2DE] shadow-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-[#5B6CFF]/10 text-[#5B6CFF] mt-0.5">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2B2B2E] truncate" title={currentDocument}>
                    {currentDocument}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Indexed & Ready
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleViewDocument}
                  className="text-xs text-[#5B6CFF] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>View content</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span className="text-[#E4E2DE] text-xs">•</span>
                <button
                  onClick={openFileDialog}
                  className="text-xs text-[#6B6B73] hover:text-[#2B2B2E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Switch</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={openFileDialog}
              className="p-4 rounded-xl border border-dashed border-[#E4E2DE] text-center space-y-2 bg-white/60 hover:bg-white hover:border-[#5B6CFF]/40 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 mx-auto rounded-full bg-[#F3F2F0] flex items-center justify-center text-[#6B6B73]">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-xs text-[#6B6B73]">Click or drag file to upload</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#E4E2DE] space-y-2 bg-white/50">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[#6B6B73] hover:text-[#2B2B2E] hover:bg-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Clear Conversation
          </button>

          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <main className="flex-1 flex flex-col bg-[#FAFAF9] relative">
        {/* Header Bar */}
        <header className="h-16 border-b border-[#E4E2DE] bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden p-2 rounded-lg text-[#6B6B73] hover:text-[#2B2B2E] hover:bg-[#F3F2F0] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-[#2B2B2E] text-sm sm:text-base">Document Assistant</h2>
                {currentDocument && (
                  <button
                    onClick={handleViewDocument}
                    title="Click to view document"
                    className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#5B6CFF]/10 text-[#5B6CFF] border border-[#5B6CFF]/20 max-w-[220px] truncate transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">{currentDocument}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-[#6B6B73]">RAG Semantic Search & Q&A</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E4E2DE] text-xs font-medium text-[#2B2B2E] shadow-xs">
              <span className={`w-2 h-2 rounded-full ${currentDocument ? "bg-emerald-500" : "bg-blue-500"}`} />
              <span>{currentDocument ? "Document Loaded" : "General Chat Mode"}</span>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="max-w-md text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#5B6CFF]/10 border border-[#5B6CFF]/20 flex items-center justify-center text-[#5B6CFF]">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-[#2B2B2E]">How can I help you today?</h3>
                <p className="text-sm text-[#6B6B73]">
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
                        ? "bg-[#5B6CFF] text-white shadow-sm"
                        : "bg-white text-[#5B6CFF] border border-[#E4E2DE] shadow-xs"
                    }`}
                  >
                    {msg.sender === "user" ? "U" : <Sparkles className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs space-y-1 ${
                      msg.sender === "user"
                        ? "bg-[#E8EAFF] text-[#2B2B2E] border border-[#5B6CFF]/25 rounded-tr-xs font-medium"
                        : "bg-white border border-[#E4E2DE] text-[#2B2B2E] rounded-tl-xs"
                    }`}
                  >
                    {msg.sender === "user" ? (
                      <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    ) : (
                      <div className="text-sm sm:text-[15px] leading-relaxed space-y-2 prose max-w-none prose-p:leading-relaxed prose-pre:bg-[#F3F2F0] prose-pre:border prose-pre:border-[#E4E2DE] prose-pre:text-[#2B2B2E]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    {msg.timestamp && (
                      <div
                        className={`text-[10px] text-right font-medium pt-1 ${
                          msg.sender === "user" ? "text-[#5B6CFF]" : "text-[#6B6B73]"
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white text-[#5B6CFF] border border-[#E4E2DE] flex items-center justify-center shrink-0 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#5B6CFF]" />
                  </div>
                  <div className="bg-white border border-[#E4E2DE] rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
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

        {/* Suggestion Chips */}
        {currentDocument && messages.length <= 3 && !loading && (
          <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-[#6B6B73] shrink-0">Try asking:</span>
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(undefined, prompt)}
                  className="text-xs bg-white hover:bg-[#F3F2F0] border border-[#E4E2DE] hover:border-[#5B6CFF]/40 text-[#2B2B2E] py-1.5 px-3 rounded-full whitespace-nowrap transition-colors cursor-pointer shadow-xs"
                >
                  {prompt} →
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 sm:p-5 border-t border-[#E4E2DE] bg-white/80 backdrop-blur-md">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-[#FAFAF9] border border-[#E4E2DE] focus-within:border-[#5B6CFF] rounded-2xl p-1.5 shadow-sm transition-all">
              <button
                type="button"
                onClick={openFileDialog}
                disabled={uploading}
                title="Upload document"
                className="p-2.5 text-[#6B6B73] hover:text-[#5B6CFF] hover:bg-white rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <Paperclip className="w-5 h-5" />
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
                className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-[#2B2B2E] placeholder-[#6B6B73] focus:outline-none disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="p-2.5 bg-[#5B6CFF] hover:bg-[#4a5be8] disabled:bg-[#E4E2DE] text-white disabled:text-[#6B6B73] rounded-xl transition-all disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6B6B73] px-2 pt-2">
              <span>Press Enter to send • Drag & drop anywhere</span>
              {currentDocument && <span className="truncate max-w-[200px]">Active: {currentDocument}</span>}
            </div>
          </form>
        </div>
      </main>

      {/* Clear Chat Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Clear entire conversation?</h3>
              <p className="text-xs text-[#6B6B73] mt-1">
                This will reset your current chat messages. Your uploaded document will remain loaded.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Sign out of DocuChat AI?</h3>
              <p className="text-xs text-[#6B6B73] mt-1">
                You will need to sign back in to access your uploaded documents and chats.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={signingOut}
                onClick={() => setShowSignOutConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  "Sign Out"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Uploaded Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2B2B2E]/40 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-4xl h-[90vh] bg-white border border-[#E4E2DE] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E4E2DE] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#5B6CFF]/10 text-[#5B6CFF] flex items-center justify-center shrink-0 border border-[#5B6CFF]/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[#2B2B2E] truncate" title={currentDocument || "Document"}>
                    {currentDocument || "Uploaded Document"}
                  </h3>
                  <p className="text-[11px] text-[#6B6B73]">Full visual document viewer</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {docUrl && (
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3F2F0] hover:bg-[#E4E2DE] text-xs font-medium text-[#2B2B2E] transition-colors"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  onClick={() => setShowDocModal(false)}
                  className="p-2 text-[#6B6B73] hover:text-[#2B2B2E] rounded-xl hover:bg-[#F3F2F0] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 my-3 overflow-hidden rounded-2xl bg-[#FAFAF9] border border-[#E4E2DE] flex flex-col">
              {docLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#6B6B73]">
                  <Loader2 className="w-6 h-6 text-[#5B6CFF] animate-spin" />
                  <span className="font-sans text-xs font-medium">Loading document preview...</span>
                </div>
              ) : docUrl && currentDocument?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={`${docUrl}#toolbar=1`}
                  className="w-full h-full rounded-2xl border-0"
                  title="PDF Preview"
                />
              ) : docUrl && (currentDocument?.toLowerCase().endsWith(".png") || currentDocument?.toLowerCase().endsWith(".jpg")) ? (
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                  <img src={docUrl} alt="Document" className="max-w-full max-h-full rounded-lg object-contain" />
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
                    <span>💡 Showing extracted text representation:</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-[#2B2B2E] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono select-text">
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
      )}
    </div>
  );
}
