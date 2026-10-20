"use client";

import { useState } from "react";

type LandingPageProps = {
  onGetStarted: () => void;
  onLoginClick: () => void;
};

export function LandingPage({ onGetStarted, onLoginClick }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Glow Ambient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Floating Modern Spacious Navbar */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 lg:px-12 pt-3 sm:pt-5 pb-3">
        <div className="max-w-6xl mx-auto h-16 sm:h-20 px-5 sm:px-8 rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-xl shadow-xl shadow-black/40 flex items-center justify-between transition-all">
          {/* Brand Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0 border border-blue-400/20">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-lg sm:text-xl text-white tracking-tight">DocuChat AI</span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                RAG 2.0
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links & Actions */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <button
                onClick={onLoginClick}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>
            <button
              onClick={onGetStarted}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Get Started</span>
              <span className="text-xs">→</span>
            </button>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2.5">
            <button
              onClick={onGetStarted}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Get Started
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 border border-slate-800 cursor-pointer transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Card */}
        {mobileMenuOpen && (
          <div className="md:hidden max-w-6xl mx-auto mt-2 p-3 rounded-2xl border border-slate-800/90 bg-slate-900/95 backdrop-blur-xl shadow-2xl space-y-1.5 animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLoginClick();
              }}
              className="w-full text-left py-3 px-4 rounded-xl text-sm text-slate-200 hover:bg-slate-800 font-medium cursor-pointer transition-colors"
            >
              Sign In to Existing Account
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onGetStarted();
              }}
              className="w-full text-center py-3 px-4 rounded-xl text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Create Free Account
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col items-center justify-center text-center relative z-10">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] sm:text-xs text-slate-300 mb-6 sm:mb-8 animate-in fade-in duration-300 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>Gemini 2.5 Flash + Supabase Vector RAG</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Talk to your documents with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300">
            instant precision.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl leading-relaxed px-2">
          Upload PDF, DOCX, or TXT documents. Ask questions and get instant, accurate answers extracted straight from your files with zero hallucination.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto max-w-md sm:max-w-none">
          <button
            onClick={onGetStarted}
            className="px-7 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-blue-600/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Start Chatting Free</span>
            <span>→</span>
          </button>
          <button
            onClick={onLoginClick}
            className="px-7 py-3.5 sm:py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-sm sm:text-base transition-all cursor-pointer flex items-center justify-center"
          >
            Sign in
          </button>
        </div>

        {/* Preview Card Mockup */}
        <div className="mt-12 sm:mt-16 w-full max-w-2xl rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 p-4 sm:p-6 shadow-2xl text-left space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 truncate">
              <span className="p-1 rounded bg-blue-500/10 text-blue-400">📄</span>
              <span className="truncate">Quarterly_Report_2026.pdf</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
              Ready
            </span>
          </div>

          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white px-3.5 py-2 rounded-xl rounded-tr-xs max-w-[85%]">
                What were the total accomplishments on Day 3?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-slate-800/90 border border-slate-700/60 text-slate-200 px-3.5 py-2.5 rounded-xl rounded-tl-xs max-w-[90%] leading-relaxed">
                Based on Section 2 of your document, the team finalized the database schema, deployed the RAG indexing pipeline, and tested 4 sample files.
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left w-full">
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Full User Isolation</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every user account is protected by Supabase Row-Level Security. Other people can never see or search your files.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Smart RAG Chunking</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Documents are automatically broken into overlapping semantic chunks so AI finds the exact sentence needed.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs space-y-2.5 sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Multiple File Formats</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upload PDF, TXT, DOC, or DOCX documents up to 4.5 MB with smooth real-time typewriter responses.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 sm:py-8 border-t border-slate-900 text-center text-xs text-slate-400 px-4">
        © {new Date().getFullYear()} DocuChat AI. Built with Next.js, Gemini & Supabase.
      </footer>
    </div>
  );
}
