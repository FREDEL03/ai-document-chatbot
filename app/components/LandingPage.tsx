"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  FileText,
  Quote,
  Mic,
  Languages,
  Link2,
  Share2,
} from "lucide-react";

const FEATURES = [
  { icon: Quote, title: "Page citations", desc: "Every answer links back to the page it came from. Click a source to open the document right there." },
  { icon: FileText, title: "Many file types", desc: "PDF, Word, Excel, CSV, PowerPoint, images and text. Scanned pages are read with OCR." },
  { icon: Link2, title: "Webpages too", desc: "Paste a URL and chat with the article as if you had uploaded it." },
  { icon: Mic, title: "Voice questions", desc: "Just speak your question. Works even when your browser's speech service doesn't." },
  { icon: Languages, title: "English or Filipino", desc: "Pick the language of the answers, or let it match how you ask." },
  { icon: Share2, title: "Share & revisit", desc: "Send a read-only link to a chat, and reuse earlier uploads from your tagged library." },
];

type LandingPageProps = {
  onGetStarted: () => void;
  onLoginClick: () => void;
};

export function LandingPage({ onGetStarted, onLoginClick }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen overflow-y-auto bg-background text-foreground flex flex-col font-sans selection:bg-accent/20 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(91,108,255,0.08),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Floating Header */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 lg:px-12 pt-4 pb-3">
        <div className="max-w-6xl mx-auto h-16 sm:h-20 px-6 sm:px-8 rounded-2xl sm:rounded-3xl border border-border bg-card/80 backdrop-blur-xl shadow-sm flex items-center justify-between transition-all">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-accent flex items-center justify-center shadow-md shadow-accent/25 shrink-0 text-white">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-lg sm:text-xl text-foreground tracking-tight">DocuChat AI</span>
            </div>
          </div>

          {/* Navigation & CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#features" className="px-3 py-2.5 text-sm font-semibold text-muted hover:text-foreground transition-colors">Features</a>
            <button
              onClick={onLoginClick}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm shadow-md shadow-accent/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onGetStarted}
              className="text-xs font-semibold bg-accent hover:bg-accent-hover text-white px-3.5 py-2 rounded-xl shadow-sm cursor-pointer"
            >
              Get Started
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface border border-border cursor-pointer transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden max-w-6xl mx-auto mt-2 p-3 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-xl space-y-1.5 animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLoginClick();
              }}
              className="w-full text-left py-3 px-4 rounded-xl text-sm text-foreground hover:bg-surface font-medium cursor-pointer transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onGetStarted();
              }}
              className="w-full text-center py-3 px-4 rounded-xl text-sm bg-accent hover:bg-accent-hover text-white font-semibold shadow-sm cursor-pointer"
            >
              Create Free Account
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex flex-col items-center justify-center text-center relative z-10">
        {/* Modern Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border text-xs text-muted mb-6 sm:mb-8 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="font-medium text-foreground">Powered by Gemini AI & Supabase Vector RAG</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl leading-[1.1]">
          Chat with your documents in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-strong">
            natural clarity.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 sm:mt-7 text-base sm:text-lg lg:text-xl text-muted max-w-2xl leading-relaxed">
          Upload PDFs, Word, Excel, slides, images or even a webpage link. Ask questions by typing or voice, and get answers that cite the exact page.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-base shadow-lg shadow-accent/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <span>Start Chatting Now</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onLoginClick}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-card hover:bg-surface border border-border text-foreground font-medium text-base shadow-xs transition-all cursor-pointer flex items-center justify-center"
          >
            Sign In to Existing Account
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Free to Use</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Private User Isolation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Sub-second Retrieval</span>
          </div>
        </div>

        {/* Mockup Preview Window */}
        <div className="mt-14 sm:mt-20 w-full max-w-3xl rounded-3xl bg-card border border-border shadow-xl shadow-black/5 p-4 sm:p-6 text-left relative overflow-hidden">
          {/* Window Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs font-mono text-muted">Quarterly_Financial_Report_2026.pdf</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Indexed & Ready
            </div>
          </div>

          {/* Chat Preview Messages */}
          <div className="py-4 space-y-3.5 text-xs sm:text-sm min-h-[230px]">
            <div className="flex justify-end fade-up" style={{ animationDelay: "0.4s" }}>
              <div className="bg-user-bubble text-foreground border border-accent/20 px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] font-medium">
                What are the key drivers for Q3 revenue growth according to page 4?
              </div>
            </div>
            <div className="flex gap-1 pl-10 demo-dots" style={{ animationDelay: "1.1s" }} aria-hidden>
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
            </div>
            <div className="flex justify-start items-start gap-2.5 fade-up -mt-5" style={{ animationDelay: "2.3s" }}>
              <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-surface border border-border text-foreground px-4 py-3 rounded-2xl rounded-tl-xs max-w-[90%] leading-relaxed space-y-1.5">
                <p>According to Section 3.2 on Page 4, the 28% YoY growth was driven by:</p>
                <ul className="list-disc pl-4 space-y-1 text-muted">
                  <li><strong className="text-foreground">Enterprise Cloud Expansion:</strong> Accounted for $4.2M in new ARR.</li>
                  <li><strong className="text-foreground">Operational Efficiency:</strong> Server maintenance overhead fell by 14%.</li>
                </ul>
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent-strong text-[11px] font-medium fade-up" style={{ animationDelay: "3s" }}>
                  <FileText className="w-3 h-3" /> Quarterly_Financial_Report_2026.pdf · p.4
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="reveal mt-20 sm:mt-28 w-full max-w-5xl scroll-mt-28">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Everything you need to understand a document</h2>
            <p className="text-sm text-muted mt-2">Built for quick answers you can verify</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl bg-card border border-border shadow-xs hover:border-accent/40 hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
                <p className="text-xs text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Step Process */}
        <div className="reveal mt-20 sm:mt-28 w-full max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">How DocuChat AI Works</h2>
            <p className="text-sm text-muted mt-2">Simple 3-step pipeline for fast, factual document insights</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs relative group hover:border-accent/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-4 font-bold text-lg">
                1
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Upload Files</h3>
              <p className="text-xs text-muted leading-relaxed">
                Drag and drop your files or paste a link. Everything is stored privately under your account.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs relative group hover:border-accent/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-4 font-bold text-lg">
                2
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Vector Indexing</h3>
              <p className="text-xs text-muted leading-relaxed">
                The document is parsed into semantic chunks and embedded in Supabase pgvector for sub-second retrieval.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs relative group hover:border-accent/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-4 font-bold text-lg">
                3
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Ask Anything</h3>
              <p className="text-xs text-muted leading-relaxed">
                Chat naturally. Gemini reads the most relevant passages and answers with citations, so you can check every claim.
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="reveal mt-20 sm:mt-28 w-full max-w-4xl rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card to-card p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Ready to ask your first question?</h2>
          <p className="text-sm sm:text-base text-muted mt-3">Create a free account and start chatting with your documents in under a minute.</p>
          <button
            onClick={onGetStarted}
            className="mt-7 px-8 py-4 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-base shadow-lg shadow-accent/25 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2.5"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border text-center text-xs text-muted px-4 relative z-10">
        © {new Date().getFullYear()} DocuChat AI. Powered by Gemini and Supabase.
      </footer>
    </div>
  );
}
