"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { FileText, Upload, Loader2, ExternalLink, Menu } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase-client";
import { authFetch } from "@/src/lib/auth-fetch";
import { exportMarkdown, exportPdf } from "@/src/lib/export-chat";
import { LandingPage } from "@/app/components/LandingPage";
import { AuthModal } from "@/app/components/AuthModal";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Sidebar } from "@/app/components/chat/Sidebar";
import { MessageList } from "@/app/components/chat/MessageList";
import { Composer } from "@/app/components/chat/Composer";
import { ConfirmDialogs } from "@/app/components/chat/ConfirmDialogs";
import { DocModal } from "@/app/components/chat/DocModal";
import { LibraryModal } from "@/app/components/chat/LibraryModal";
import { ShareModal } from "@/app/components/chat/ShareModal";
import { MAX_DOCS } from "@/app/components/chat/types";
import type { Message, UploadedDoc, Conversation, Lang } from "@/app/components/chat/types";
import { LanguageSelect } from "@/app/components/LanguageSelect";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "👋 Hello! I'm DocuChat AI. You can chat with me freely, or upload a document (PDF, Word, Excel, PowerPoint, CSV, TXT, image) to ask questions about its content.",
      sender: "ai",
      timestamp: "Just now",
    },
  ]);
  const [loading, setLoading] = useState(false); // waiting for the first chunk (typing dots)
  const [generating, setGenerating] = useState(false); // request in flight, including while text streams
  const [lang, setLang] = useState<Lang>("auto");

  // Restore the saved language after mount (reading localStorage during render would break hydration)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("docuchat_lang");
      if (saved === "en" || saved === "fil") setLang(saved);
    } catch {}
  }, []);

  const changeLang = (v: Lang) => {
    setLang(v);
    try {
      localStorage.setItem("docuchat_lang", v);
    } catch {}
  };
  const abortRef = useRef<AbortController | null>(null);
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
  const [showLibrary, setShowLibrary] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docPage, setDocPage] = useState<number | null>(null); // PDF page to open at (from citations)
  const [docText, setDocText] = useState<string | null>(null);
  const [docModalTab, setDocModalTab] = useState<"visual" | "text">("visual");

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

  const handleStop = () => abortRef.current?.abort();

  const lastUserIndex = () => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender === "user") return i;
    return -1;
  };

  // Drop the last answer and ask the same question again (server skips its cache)
  const handleRegenerate = () => {
    const i = lastUserIndex();
    if (i < 0 || generating) return;
    const text = messages[i].text;
    setMessages(messages.slice(0, i + 1));
    handleSend(undefined, text, { regenerate: true });
  };

  // Put the last question back in the input box and remove it (and its answer) from the chat
  const handleEditLast = () => {
    const i = lastUserIndex();
    if (i < 0 || generating) return;
    setMessage(messages[i].text);
    setMessages(messages.slice(0, i));
  };

  const handleSend = async (e?: React.SyntheticEvent, customText?: string, opts?: { regenerate?: boolean }) => {
    if (e) e.preventDefault();
    const textToSend = (customText || message).trim();
    if (!textToSend || generating) return;

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage: Message = {
      id: Date.now(),
      text: textToSend,
      sender: "user",
      timestamp: timeString,
    };

    setMessage("");
    if (!opts?.regenerate) setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          regenerate: !!opts?.regenerate,
          language: lang,
          message: textToSend,
          document: currentDocument,
          documentId: currentDocumentId,
          documentIds: documents.map((d) => d.id),
          documents: documents.map((d) => ({ id: d.id, name: d.name })),
        }),
      });

      const aiId = Date.now() + 1;
      const isJson = response.headers.get("content-type")?.includes("application/json");

      if (isJson || !response.body) {
        // Errors, mock replies and cached answers come back as JSON
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
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          { id: aiId, text: data.answer || "", sender: "ai", timestamp: timeString, cached: !!data.cached, sources: data.sources },
        ]);
      } else {
        // Live answer: append text as it streams in
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let sources: Message["sources"];
        try {
          sources = JSON.parse(decodeURIComponent(response.headers.get("X-Sources") || "[]"));
        } catch {}
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          { id: aiId, text: "", sender: "ai", timestamp: timeString, cached: false, sources },
        ]);
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const shown = acc.trimStart();
          setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, text: shown } : m)));
        }
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return; // user pressed Stop: keep whatever text already arrived
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
      setGenerating(false);
      abortRef.current = null;
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
    const toSummarize: { id: string; name: string }[] = [];

    for (const file of filesToUpload) {
      if (file.size > 4.5 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 4.5 MB limit.`);
        continue;
      }

      const toastId = toast.loading(`Uploading "${file.name}"...`);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const localBlob = URL.createObjectURL(file);

        const response = await authFetch("/api/upload", {
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

        if (data.imageReadFailed) {
          toast.warning(`"${file.name}" uploaded, but images inside could not be read (AI busy). Re-upload to retry.`, { id: toastId, duration: 8000 });
        } else {
          toast.success(`"${file.name}" ready for chat!`, { id: toastId });
        }
        successCount++;
        if (data.documentId && data.extracted) toSummarize.push({ id: data.documentId, name: file.name });
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

    // Summaries arrive later and are optional: don't block the upload on them
    toSummarize.forEach((d) => summarizeDocument(d.id, d.name));
  };

  // Fetch a webpage's text on the server, then feed it through the normal upload pipeline as a .txt file
  const addUrl = async (url: string): Promise<boolean> => {
    const toastId = toast.loading("Reading webpage...");
    try {
      const res = await authFetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not read that page");
      toast.dismiss(toastId);
      await uploadFiles([new File([data.text], data.name, { type: "text/plain" })]);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Could not read that page", { id: toastId });
      return false;
    }
  };

  // Ask the server for a short summary + 3 suggested questions, then post it in the chat
  const summarizeDocument = async (docId: string, docName: string) => {
    try {
      const res = await authFetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, language: lang }),
      });
      if (!res.ok) return;
      const { summary, questions } = await res.json();
      setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, questions } : d)));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          text: `### Summary: ${docName}\n\n${summary}`,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.warn("Summary failed:", err);
    }
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
    onDropRejected: (rejected) =>
      rejected.forEach((r) => toast.error(`"${r.file.name}" skipped: ${r.errors[0]?.message || "not allowed"}`)),
    noClick: true,
    noKeyboard: true,
    multiple: true,
    maxFiles: MAX_DOCS,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"], // how Windows often reports .csv
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
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

  // Re-use a document that was uploaded earlier: no re-upload, the viewer fetches its link on demand
  const addFromLibrary = (doc: UploadedDoc) => {
    if (documents.length >= MAX_DOCS) {
      toast.error(`Maximum of ${MAX_DOCS} documents reached. Please clear a file first.`);
      return;
    }
    if (documents.some((d) => d.id === doc.id)) return;
    setDocuments((prev) => [...prev, doc]);
    setCurrentDocument(doc.name);
    setCurrentDocumentId(doc.id);
    setDocUrl(null);
    toast.success(`"${doc.name}" added to this chat`);
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

  const handleViewDocument = async (docToView?: UploadedDoc, page?: number | null) => {
    setDocPage(page ?? null);
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

      const res = await authFetch(`/api/document?${params.toString()}`);
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


  if (authChecking) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-muted">
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
      className="flex h-screen bg-background text-foreground overflow-hidden font-sans relative"
    >
      <input {...getInputProps()} />

      {/* Drag & Drop Visual Overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-user-bubble/90 backdrop-blur-sm border-2 border-dashed border-[#5B6CFF] flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl bg-[#5B6CFF]/15 border border-[#5B6CFF]/30 text-[#5B6CFF] mb-3 animate-bounce">
            <Upload className="w-10 h-10" />
          </div>
          <p className="text-xl font-bold text-foreground">Drop your document here</p>
          <p className="text-xs text-muted mt-1">PDF, Word, Excel, PowerPoint, CSV, TXT up to 4.5MB</p>
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
      <Sidebar
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        handleNewChat={handleNewChat}
        openFileDialog={openFileDialog}
        uploading={uploading}
        documents={documents}
        handleViewDocument={handleViewDocument}
        handleRemoveDocument={handleRemoveDocument}
        handleClearAllDocuments={handleClearAllDocuments}
        conversations={conversations}
        currentConvoId={currentConvoId}
        handleSelectConversation={handleSelectConversation}
        handleDeleteConversation={handleDeleteConversation}
        setShowClearConfirm={setShowClearConfirm}
        setShowSignOutConfirm={setShowSignOutConfirm}
        canExport={messages.some((m) => m.sender === "user")}
        onExportMarkdown={() => exportMarkdown(messages, documents)}
        onExportPdf={() => exportPdf(documents)}
        onAddUrl={addUrl}
        onOpenLibrary={() => setShowLibrary(true)}
        onShare={() => setShowShare(true)}
      />


      {/* Main Chat Panel */}
      <main className="flex-1 flex flex-col bg-background relative">
        {/* Header Bar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground text-sm sm:text-base">Document Assistant</h2>
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
              <p className="text-xs text-muted">RAG Semantic Search & Q&A</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground shadow-xs">
              <span className={`w-2 h-2 rounded-full ${documents.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`} />
              <span>
                {documents.length === 1
                  ? "1 Document Active"
                  : documents.length > 1
                  ? `${documents.length} Documents Active`
                  : "General Chat Mode"}
              </span>
            </div>
            <LanguageSelect value={lang} onChange={changeLang} />
            <ThemeToggle />
          </div>
        </header>

        {/* Chat Messages */}
        <MessageList
          messages={messages}
          loading={loading}
          documents={documents}
          handleViewDocument={handleViewDocument}
          messagesEndRef={messagesEndRef}
          generating={generating}
          onRegenerate={handleRegenerate}
          onEditLast={handleEditLast}
        />

        <Composer
          messages={messages}
          documents={documents}
          generating={generating}
          onStop={handleStop}
          language={lang}
          uploading={uploading}
          message={message}
          setMessage={setMessage}
          currentDocument={currentDocument}
          openFileDialog={openFileDialog}
          handleSend={handleSend}
        />
      </main>

      <ConfirmDialogs
        documents={documents}
        showClearConfirm={showClearConfirm}
        setShowClearConfirm={setShowClearConfirm}
        handleClearChat={handleClearChat}
        showSignOutConfirm={showSignOutConfirm}
        setShowSignOutConfirm={setShowSignOutConfirm}
        signingOut={signingOut}
        handleSignOut={handleSignOut}
        fileToDelete={fileToDelete}
        setFileToDelete={setFileToDelete}
        confirmRemoveDocument={confirmRemoveDocument}
        showClearFilesConfirm={showClearFilesConfirm}
        setShowClearFilesConfirm={setShowClearFilesConfirm}
        confirmClearAllDocuments={confirmClearAllDocuments}
        convoToDelete={convoToDelete}
        setConvoToDelete={setConvoToDelete}
        confirmDeleteConversation={confirmDeleteConversation}
      />

      {showShare && <ShareModal messages={messages} documents={documents} onClose={() => setShowShare(false)} />}

      {showLibrary && (
        <LibraryModal documents={documents} maxDocs={MAX_DOCS} onAdd={addFromLibrary} onClose={() => setShowLibrary(false)} />
      )}

      {showDocModal && (
        <DocModal
          documents={documents}
          currentDocument={currentDocument}
          docUrl={docUrl}
          docPage={docPage}
          docText={docText}
          docLoading={docLoading}
          docModalTab={docModalTab}
          setDocModalTab={setDocModalTab}
          setShowDocModal={setShowDocModal}
          handleViewDocument={handleViewDocument}
          onGoToPage={setDocPage}
        />
      )}
    </div>
  );
}
