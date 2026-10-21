"use client";

import { useState } from "react";
import {
  FileText,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

type LandingPageProps = {
  onGetStarted: () => void;
  onLoginClick: () => void;
};

export function LandingPage({ onGetStarted, onLoginClick }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#2B2B2E] flex flex-col font-sans selection:bg-[#5B6CFF]/20 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(91,108,255,0.08),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#E4E2DE_1px,transparent_1px),linear-gradient(to_bottom,#E4E2DE_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Floating Header */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 lg:px-12 pt-4 pb-3">
        <div className="max-w-6xl mx-auto h-16 sm:h-20 px-6 sm:px-8 rounded-2xl sm:rounded-3xl border border-[#E4E2DE] bg-white/80 backdrop-blur-xl shadow-sm flex items-center justify-between transition-all">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#5B6CFF] flex items-center justify-center shadow-md shadow-[#5B6CFF]/25 shrink-0 text-white">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-lg sm:text-xl text-[#2B2B2E] tracking-tight">DocuChat AI</span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-[#5B6CFF]/10 text-[#5B6CFF] border border-[#5B6CFF]/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B6CFF] animate-pulse" />
                RAG 2.0
              </span>
            </div>
          </div>

          {/* Navigation & CTA */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={onLoginClick}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#6B6B73] hover:text-[#2B2B2E] hover:bg-[#F3F2F0] transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-6 py-2.5 rounded-xl bg-[#5B6CFF] hover:bg-[#4a5be8] text-white font-semibold text-sm shadow-md shadow-[#5B6CFF]/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onGetStarted}
              className="text-xs font-semibold bg-[#5B6CFF] hover:bg-[#4a5be8] text-white px-3.5 py-2 rounded-xl shadow-sm cursor-pointer"
            >
              Get Started
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#6B6B73] hover:text-[#2B2B2E] hover:bg-[#F3F2F0] border border-[#E4E2DE] cursor-pointer transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden max-w-6xl mx-auto mt-2 p-3 rounded-2xl border border-[#E4E2DE] bg-white/95 backdrop-blur-xl shadow-xl space-y-1.5 animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLoginClick();
              }}
              className="w-full text-left py-3 px-4 rounded-xl text-sm text-[#2B2B2E] hover:bg-[#F3F2F0] font-medium cursor-pointer transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onGetStarted();
              }}
              className="w-full text-center py-3 px-4 rounded-xl text-sm bg-[#5B6CFF] hover:bg-[#4a5be8] text-white font-semibold shadow-sm cursor-pointer"
            >
              Create Free Account
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex flex-col items-center justify-center text-center relative z-10">
        {/* Modern Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E4E2DE] text-xs text-[#6B6B73] mb-6 sm:mb-8 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#5B6CFF]" />
          <span className="font-medium text-[#2B2B2E]">Powered by Gemini AI & Supabase Vector RAG</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#6B6B73]" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#2B2B2E] max-w-4xl leading-[1.1]">
          Chat with your documents in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B6CFF] via-[#7483ff] to-[#4a5be8]">
            natural clarity.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 sm:mt-7 text-base sm:text-lg lg:text-xl text-[#6B6B73] max-w-2xl leading-relaxed">
          Drop any PDF, TXT, DOC or DOCX file. Ask specific questions, produce summaries, and extract citations with zero hallucination.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#5B6CFF] hover:bg-[#4a5be8] text-white font-semibold text-base shadow-lg shadow-[#5B6CFF]/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <span>Start Chatting Now</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onLoginClick}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-[#F3F2F0] border border-[#E4E2DE] text-[#2B2B2E] font-medium text-base shadow-xs transition-all cursor-pointer flex items-center justify-center"
          >
            Sign In to Existing Account
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#6B6B73]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>100% Free to Use</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#5B6CFF]" />
            <span>Private User Isolation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Sub-second Retrieval</span>
          </div>
        </div>

        {/* Mockup Preview Window */}
        <div className="mt-14 sm:mt-20 w-full max-w-3xl rounded-3xl bg-white border border-[#E4E2DE] shadow-xl shadow-black/5 p-4 sm:p-6 text-left relative overflow-hidden">
          {/* Window Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E4E2DE]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs font-mono text-[#6B6B73]">Quarterly_Financial_Report_2026.pdf</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Indexed & Ready
            </div>
          </div>

          {/* Chat Preview Messages */}
          <div className="py-4 space-y-3.5 text-xs sm:text-sm">
            <div className="flex justify-end">
              <div className="bg-[#E8EAFF] text-[#2B2B2E] border border-[#5B6CFF]/20 px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] font-medium">
                What are the key drivers for Q3 revenue growth according to page 4?
              </div>
            </div>
            <div className="flex justify-start items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#5B6CFF]/10 border border-[#5B6CFF]/20 text-[#5B6CFF] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#F3F2F0] border border-[#E4E2DE] text-[#2B2B2E] px-4 py-3 rounded-2xl rounded-tl-xs max-w-[90%] leading-relaxed space-y-1.5">
                <p>According to Section 3.2 on Page 4, the 28% YoY growth was driven by:</p>
                <ul className="list-disc pl-4 space-y-1 text-[#6B6B73]">
                  <li><strong className="text-[#2B2B2E]">Enterprise Cloud Expansion:</strong> Accounted for $4.2M in new ARR.</li>
                  <li><strong className="text-[#2B2B2E]">Operational Efficiency:</strong> Server maintenance overhead fell by 14%.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Step Process */}
        <div className="mt-20 sm:mt-28 w-full max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2B2B2E] tracking-tight">How DocuChat AI Works</h2>
            <p className="text-sm text-[#6B6B73] mt-2">Simple 3-step pipeline for fast, factual document insights</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-white border border-[#E4E2DE] shadow-xs relative group hover:border-[#5B6CFF]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#5B6CFF]/10 border border-[#5B6CFF]/20 text-[#5B6CFF] flex items-center justify-center mb-4 font-bold text-lg">
                1
              </div>
              <h3 className="text-base font-semibold text-[#2B2B2E] mb-2">Upload Files</h3>
              <p className="text-xs text-[#6B6B73] leading-relaxed">
                Drag and drop your PDF, DOCX, or text files directly. Our server stores and secures it privately under your account.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E4E2DE] shadow-xs relative group hover:border-[#5B6CFF]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#5B6CFF]/10 border border-[#5B6CFF]/20 text-[#5B6CFF] flex items-center justify-center mb-4 font-bold text-lg">
                2
              </div>
              <h3 className="text-base font-semibold text-[#2B2B2E] mb-2">Vector Indexing</h3>
              <p className="text-xs text-[#6B6B73] leading-relaxed">
                The document is parsed into semantic chunks and embedded in Supabase pgvector for sub-second retrieval.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E4E2DE] shadow-xs relative group hover:border-[#5B6CFF]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#5B6CFF]/10 border border-[#5B6CFF]/20 text-[#5B6CFF] flex items-center justify-center mb-4 font-bold text-lg">
                3
              </div>
              <h3 className="text-base font-semibold text-[#2B2B2E] mb-2">Ask Anything</h3>
              <p className="text-xs text-[#6B6B73] leading-relaxed">
                Chat naturally. Gemini inspects the exact relevant chunks to formulate factual, cited answers with no hallucinations.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-[#E4E2DE] text-center text-xs text-[#6B6B73] px-4 relative z-10">
        © {new Date().getFullYear()} DocuChat AI. Secured with Supabase RLS & Gemini 2.5 Flash.
      </footer>
    </div>
  );
}
