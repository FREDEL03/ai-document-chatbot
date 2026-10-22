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
  Eye,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  MessageSquare,
  Zap,
} from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase-client";
import { LandingPage } from "@/app/components/LandingPage";
import { AuthModal } from "@/app/components/AuthModal";

type Message = {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp?: string;
  cached?: boolean;
};

type UploadedDoc = {
  id: string;
  name: string;
  url?: string | null;
  size?: number;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
  documents: UploadedDoc[];
};

const MAX_DOCS = 5;

const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-base sm:text-lg font-bold text-[#1F1F23] mt-3.5 mb-2 pb-1.5 border-b border-[#E4E2DE] flex items-center gap-1.5 tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-sm sm:text-base font-bold text-[#1F1F23] mt-3 mb-1.5 flex items-center gap-1.5 tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-xs sm:text-sm font-semibold text-[#5B6CFF] mt-2.5 mb-1 tracking-wide">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed text-[#2B2B2E] my-1.5 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="my-2 space-y-1.5 pl-5 list-disc marker:text-[#5B6CFF] text-[13.5px] sm:text-[14.5px]">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-2 space-y-1.5 pl-5 list-decimal marker:text-[#5B6CFF] marker:font-semibold text-[13.5px] sm:text-[14.5px]">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed text-[#2B2B2E] pl-0.5">
      {children}
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-[#2435b8] bg-[#5B6CFF]/10 px-1 py-0.5 rounded">
      {children}
    </strong>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-2.5 pl-3.5 py-1.5 border-l-3 border-[#5B6CFF] bg-[#F3F2F0]/80 rounded-r-xl text-xs sm:text-[13.5px] text-[#4A4A50] italic">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-[#E4E2DE] shadow-xs">
      <table className="min-w-full divide-y divide-[#E4E2DE] text-xs sm:text-[13px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-[#F3F2F0] text-[#1F1F23] font-semibold">{children}</thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-[#E4E2DE]/60 bg-white">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-[#FAFAF9] transition-colors">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-3.5 py-2.5 text-left font-semibold text-[#1F1F23]">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-3.5 py-2.5 text-[#2B2B2E] leading-normal">{children}</td>
  ),
  code: ({ inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code className="bg-[#F3F2F0] text-[#5B6CFF] font-mono text-[12px] px-1.5 py-0.5 rounded-md border border-[#E4E2DE]/80 font-medium" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-xs text-[#FAFAF9] leading-relaxed block" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => (
    <pre className="my-2.5 p-3.5 rounded-xl bg-[#202024] text-[#FAFAF9] font-mono text-xs overflow-x-auto border border-[#2B2B2E] shadow-xs leading-relaxed">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3.5 border-t border-[#E4E2DE]" />,
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
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvoId, setCurrentConvoId] = useState<string>("");
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showClearFilesConfirm, setShowClearFilesConfirm] = useState(false);
  const [convoToDelete, setConvoToDelete] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [showDocModal, setShowDocModal] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docText, setDocText] = useState<string | null>(null);
  const [docModalTab, setDocModalTab] = useState<"visual" | "text">("visual");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Check active Supabase auth session and load user data
  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      supabase.auth.getUser().then(({ data }: { data: any }) => {
        const u = data?.user ?? null;
        setUser(u);
        setAuthChecking(false);
        if (u?.id) {
          try {
            // Load conversation history
            const savedConvos = localStorage.getItem(`docuchat_convos_${u.id}`);
            if (savedConvos) {
              const parsed: Conversation[] = JSON.parse(savedConvos);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setConversations(parsed);
                const latest = parsed[0];
                setCurrentConvoId(latest.id);
                setMessages(latest.messages);
                if (Array.isArray(latest.documents)) {
                  setDocuments(latest.documents);
                  if (latest.documents.length > 0) {
                    setCurrentDocument(latest.documents[0].name);
                    setCurrentDocumentId(latest.documents[0].id);
                    setDocUrl(latest.documents[0].url || null);
                  }
                }
                return;
              }
            }

            // Fallback for first session
            const newId = Date.now().toString();
            setCurrentConvoId(newId);
          } catch {}
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        const u = session?.user ?? null;
        setUser(u);
        if (!u) {
          setCurrentDocument(null);
          setCurrentDocumentId(null);
          setDocuments([]);
          setConversations([]);
        }
      });

      return () => {
        listener?.subscription?.unsubscribe();
      };
    } catch {
      setAuthChecking(false);
    }
  }, []);

  // Save active conversation into conversations history in localStorage
  useEffect(() => {
    if (!user?.id || authChecking || !currentConvoId) return;

    const hasUserMsg = messages.some((m) => m.sender === "user");
    if (!hasUserMsg && messages.length <= 1 && documents.length === 0) return;

    const firstUserMsg = messages.find((m) => m.sender === "user");
    const title = firstUserMsg
      ? firstUserMsg.text.slice(0, 36)
      : documents.length > 0
      ? `Chat: ${documents[0].name}`
      : "New Conversation";

    setConversations((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === currentConvoId);
      const updatedItem: Conversation = {
        id: currentConvoId,
        title,
        updatedAt: Date.now(),
        messages,
        documents,
      };

      let newConvos: Conversation[];
      if (existingIdx >= 0) {
        newConvos = [...prev];
        newConvos[existingIdx] = updatedItem;
      } else {
        newConvos = [updatedItem, ...prev];
      }

      newConvos.sort((a, b) => b.updatedAt - a.updatedAt);
      try {
        localStorage.setItem(`docuchat_convos_${user.id}`, JSON.stringify(newConvos));
      } catch {}
      return newConvos;
    });
  }, [messages, documents, currentConvoId, user?.id, authChecking]);

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
          documentIds: documents.map((d) => d.id),
          documents: documents.map((d) => ({ id: d.id, name: d.name })),
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
      const isCached = !!data.cached;
      const aiId = Date.now() + 1;
      setLoading(false);

      if (isCached) {
        setMessages((prev) => [
          ...prev,
          { id: aiId, text: fullText, sender: "ai", timestamp: timeString, cached: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: aiId, text: "", sender: "ai", timestamp: timeString, cached: false },
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
      }
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

  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    if (documents.length >= MAX_DOCS) {
      toast.error(`Maximum of ${MAX_DOCS} documents reached. Please clear a file first.`);
      return;
    }

    const availableSlots = MAX_DOCS - documents.length;
    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast.warning(`Only uploading ${availableSlots} file(s) to respect the ${MAX_DOCS} document limit.`);
    }

    setUploading(true);
    let successCount = 0;

    for (const file of filesToUpload) {
      if (file.size > 4.5 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 4.5 MB limit.`);
        continue;
      }

      const toastId = toast.loading(`Uploading "${file.name}"...`);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (user?.id) formData.append("userId", user.id);

        const localBlob = URL.createObjectURL(file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const raw = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error("Invalid response from server");
        }

        if (!response.ok) throw new Error(data.error || "Upload failed");

        const newDoc: UploadedDoc = {
          id: data.documentId || `${Date.now()}_${file.name}`,
          name: file.name,
          url: data.signedUrl || localBlob,
          size: file.size,
        };

        setDocuments((prev) => {
          const exists = prev.some((d) => d.id === newDoc.id || d.name === newDoc.name);
          return exists ? prev : [...prev, newDoc];
        });

        setCurrentDocument(file.name);
        setCurrentDocumentId(newDoc.id);
        setDocUrl(newDoc.url || localBlob);

        toast.success(`"${file.name}" ready for chat!`, { id: toastId });
        successCount++;
      } catch (err: any) {
        toast.error(`Failed to upload "${file.name}": ${err?.message || "Error"}`, { id: toastId });
      }
    }

    if (successCount > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `📄 ${successCount === 1 ? "Document" : `${successCount} documents`} indexed successfully! You can now ask questions about your documents.`,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }

    setUploading(false);
    setSidebarOpen(false);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadFiles(acceptedFiles);
      }
    },
    [documents, user?.id]
  );

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: true,
    maxFiles: MAX_DOCS,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  });

  const handleNewChat = () => {
    const newId = Date.now().toString();
    setCurrentConvoId(newId);
    setMessages([
      {
        id: Date.now(),
        text: "👋 New conversation started. Ask questions about your documents or chat freely!",
        sender: "ai",
        timestamp: "Just now",
      },
    ]);
    toast.success("New chat started");
    setSidebarOpen(false);
  };

  const handleSelectConversation = (convo: Conversation) => {
    setCurrentConvoId(convo.id);
    setMessages(convo.messages);
    if (Array.isArray(convo.documents)) {
      setDocuments(convo.documents);
      if (convo.documents.length > 0) {
        setCurrentDocument(convo.documents[0].name);
        setCurrentDocumentId(convo.documents[0].id);
        setDocUrl(convo.documents[0].url || null);
      } else {
        setCurrentDocument(null);
        setCurrentDocumentId(null);
        setDocUrl(null);
      }
    }
    setSidebarOpen(false);
    toast.info(`Switched to "${convo.title}"`);
  };

  const handleDeleteConversation = (convoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConvoToDelete(convoId);
  };

  const confirmDeleteConversation = () => {
    if (!convoToDelete) return;
    const convoId = convoToDelete;
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== convoId);
      if (user?.id) {
        try {
          localStorage.setItem(`docuchat_convos_${user.id}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    if (currentConvoId === convoId) {
      handleNewChat();
    }
    setConvoToDelete(null);
    toast.info("Conversation deleted");
  };

  const handleRemoveDocument = (docId: string, docName: string) => {
    setFileToDelete({ id: docId, name: docName });
  };

  const confirmRemoveDocument = () => {
    if (!fileToDelete) return;
    const { id: docId, name: docName } = fileToDelete;
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.id !== docId && d.name !== docName);
      if (filtered.length === 0) {
        setCurrentDocument(null);
        setCurrentDocumentId(null);
        setDocUrl(null);
      } else if (currentDocument === docName || currentDocumentId === docId) {
        setCurrentDocument(filtered[0].name);
        setCurrentDocumentId(filtered[0].id);
        setDocUrl(filtered[0].url || null);
      }
      return filtered;
    });
    setFileToDelete(null);
    toast.info(`Removed "${docName}"`);
  };

  const handleClearAllDocuments = () => {
    setShowClearFilesConfirm(true);
  };

  const confirmClearAllDocuments = () => {
    setDocuments([]);
    setCurrentDocument(null);
    setCurrentDocumentId(null);
    setDocUrl(null);
    setShowClearFilesConfirm(false);
    toast.info("All documents cleared. General chat mode active.");
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        text: documents.length > 0
          ? `Chat cleared. Ready for your questions about your ${documents.length} document(s).`
          : "Chat cleared. General chat mode active.",
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
          localStorage.removeItem(`docuchat_convos_${user.id}`);
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
      setDocuments([]);
      setConversations([]);
      setShowSignOutConfirm(false);
      toast.success("Signed out successfully");
    } finally {
      setSigningOut(false);
    }
  };

  const handleViewDocument = async (docToView?: UploadedDoc) => {
    const targetName = docToView ? docToView.name : currentDocument;
    const targetId = docToView ? docToView.id : currentDocumentId;
    if (!targetName && !targetId) return;

    if (docToView) {
      setCurrentDocument(docToView.name);
      setCurrentDocumentId(docToView.id);
      if (docToView.url) setDocUrl(docToView.url);
    }

    setShowDocModal(true);
    setDocModalTab("visual");

    if (!docUrl && !docToView?.url) {
      setDocLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (targetId) params.set("id", targetId);
      if (targetName) params.set("name", targetName);
      if (user?.id) params.set("userId", user.id);

      const res = await fetch(`/api/document?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.signedUrl) {
          setDocUrl(data.signedUrl);
          setDocuments((prev) =>
            prev.map((d) =>
              d.name === targetName || d.id === targetId ? { ...d, url: data.signedUrl } : d
            )
          );
        }
        if (data.extractedText) {
          setDocText(data.extractedText);
        }
      } else {
        const supabase = getSupabaseClient();
        let query = supabase.from("documents").select("storage_path, extracted_text, id");
        if (targetId) {
          query = query.eq("id", targetId);
        } else if (targetName) {
          query = query.eq("original_name", targetName);
          if (user?.id) query = query.eq("user_id", user.id);
        }
        const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (data?.storage_path) {
          const { data: urlData } = await supabase.storage.from("documents").createSignedUrl(data.storage_path, 3600);
          if (urlData?.signedUrl) setDocUrl(urlData.signedUrl);
        }
        if (data?.extracted_text) setDocText(data.extracted_text);
      }
    } catch (err) {
      console.error("Document preview fetch error:", err);
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
                {documents.length > 0 ? (
                  <button
                    onClick={() => handleViewDocument()}
                    title="Click to view active document preview"
                    className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#5B6CFF]/10 text-[#5B6CFF] border border-[#5B6CFF]/20 max-w-[240px] truncate transition-colors cursor-pointer hover:bg-[#5B6CFF]/15"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{currentDocument || `${documents.length} documents`}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-[#6B6B73]">RAG Semantic Search & Q&A</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E4E2DE] text-xs font-medium text-[#2B2B2E] shadow-xs">
              <span className={`w-2 h-2 rounded-full ${documents.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`} />
              <span>
                {documents.length === 1
                  ? "1 Document Active"
                  : documents.length > 1
                  ? `${documents.length} Documents Active`
                  : "General Chat Mode"}
              </span>
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
                  className={`flex items-start gap-2.5 sm:gap-3 ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                      msg.sender === "user"
                        ? "bg-[#5B6CFF] text-white shadow-sm"
                        : "bg-white text-[#5B6CFF] border border-[#E4E2DE] shadow-xs"
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
                    </div>
                  ) : (
                    <div className="max-w-[92%] sm:max-w-[85%] bg-white border border-[#E4E2DE] rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs space-y-2 text-[#2B2B2E]">
                      {/* AI Header Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#E4E2DE]/70 text-xs">
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
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            setCopiedId(msg.id);
                            toast.success("Response copied to clipboard");
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[#F3F2F0] text-[11px] text-[#6B6B73] hover:text-[#2B2B2E] transition-colors cursor-pointer"
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

                      {/* Rendered AI Markdown Content */}
                      <div className="text-sm leading-relaxed overflow-hidden">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>

                      {msg.timestamp && (
                        <div className="text-[10px] text-right font-medium text-[#6B6B73] pt-1 border-t border-[#E4E2DE]/40">
                          {msg.timestamp}
                        </div>
                      )}
                    </div>
                  )}
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
        {documents.length > 0 && messages.length <= 3 && !loading && (
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
                disabled={uploading || documents.length >= MAX_DOCS}
                title={documents.length >= MAX_DOCS ? `Limit reached (${MAX_DOCS}/${MAX_DOCS})` : "Attach document"}
                className="p-2.5 text-[#6B6B73] hover:text-[#5B6CFF] hover:bg-white rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
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

      {/* Delete Single File Confirmation Dialog */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Remove uploaded file?</h3>
              <p className="text-xs text-[#6B6B73] mt-1 break-all">
                Are you sure you want to remove <span className="font-semibold text-[#2B2B2E]">"{fileToDelete.name}"</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveDocument}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Remove File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Files Confirmation Dialog */}
      {showClearFilesConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Clear all uploaded files?</h3>
              <p className="text-xs text-[#6B6B73] mt-1">
                All {documents.length} active documents will be removed. The assistant will switch to general chat mode.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearFilesConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearAllDocuments}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Conversation Confirmation Dialog */}
      {convoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Delete conversation?</h3>
              <p className="text-xs text-[#6B6B73] mt-1">
                This conversation will be permanently removed from your chat history.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConvoToDelete(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Uploaded Document Modal */}
      {showDocModal && (
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
                      data={`${docUrl}#toolbar=1&navpanes=0`}
                      type="application/pdf"
                      className="w-full h-full rounded-2xl"
                    >
                      <iframe
                        src={`${docUrl}#toolbar=1`}
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
                ) : docUrl && (currentDocument?.toLowerCase().endsWith(".png") || currentDocument?.toLowerCase().endsWith(".jpg") || currentDocument?.toLowerCase().endsWith(".jpeg")) ? (
                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                    <img src={docUrl} alt="Document" className="max-w-full max-h-full rounded-lg object-contain shadow-sm" />
                  </div>
                ) : currentDocument?.toLowerCase().endsWith(".txt") ? (
                  <div className="flex-1 overflow-y-auto p-5 text-[#2B2B2E] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono select-text bg-white">
                    {docText || "No content found in this text file."}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#5B6CFF]/10 text-[#5B6CFF] flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2B2B2E]">{currentDocument}</p>
                      <p className="text-xs text-[#6B6B73] max-w-sm mt-1">
                        Direct visual preview for Word/DOCX is best viewed downloaded or via Extracted Text tab below.
                      </p>
                    </div>
                    {docUrl && (
                      <a
                        href={docUrl}
                        download={currentDocument || "document"}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B6CFF] hover:bg-[#4a5be8] text-white text-xs font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Original File</span>
                      </a>
                    )}
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
      )}
    </div>
  );
}
