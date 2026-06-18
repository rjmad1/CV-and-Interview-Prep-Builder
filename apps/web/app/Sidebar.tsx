"use client";

import React, { useState } from "react";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-30">
        <h1 className="text-md font-extrabold tracking-tight flex items-center gap-2">
          <span className="p-1 rounded bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-mono text-[10px]">CI</span>
          <span className="gradient-text">Studio</span>
        </h1>
        <button
          id="mobile-menu-toggle"
          onClick={() => setOpen(!open)}
          className="p-2 text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
          aria-label="Toggle Navigation Sidebar"
          aria-expanded={open}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Backdrop Overlay for Mobile Drawer */}
      {open && (
        <div
          id="sidebar-backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Navigation Sidebar Panel */}
      <aside
        id="sidebar-navigation"
        className={`w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-md flex flex-col fixed h-screen z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-mono text-xs">CI</span>
              <span className="gradient-text">Studio</span>
            </h1>
            <p className="text-[10px] text-purple-400 mt-1 uppercase tracking-widest font-semibold font-mono">Enterprise AI Platform</p>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
            aria-label="Close Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          <a
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>📊</span> Dashboard
          </a>
          <a
            href="/archive"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>📁</span> Career Documents
          </a>
          <a
            href="/archive?type=resumes"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>📄</span> Resume Library
          </a>
          <a
            href="/jd-analysis"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>🎯</span> Job Description Analyzer
          </a>
          <a
            href="/optimize"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>⚙️</span> CV Optimizer
          </a>
          <a
            href="/grounding-audit"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>🛡️</span> Grounding Auditor
          </a>
          <a
            href="/cover-letter"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>✉️</span> Cover Letter Generator
          </a>
          <a
            href="/ats-report"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>📈</span> ATS Match Report
          </a>
          <a
            href="/applications"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>📅</span> Application Tracker
          </a>
          <a
            href="/interview?mode=prep"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>💡</span> Interview Preparation
          </a>
          <a
            href="/interview"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>🗣️</span> Mock Interviews
          </a>
          <a
            href="/skills-gap"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>📊</span> Skills Gap Analysis
          </a>
          <a
            href="/learning"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>🎓</span> Learning Recommendations
          </a>
          <a
            href="/saved-applications"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>⭐</span> Saved Applications
          </a>
          <a
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
          >
            <span>🛠️</span> Settings
          </a>
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs">
              LA
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Staff Architect</p>
              <p className="text-[10px] text-slate-500">developer@cis.internal</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
