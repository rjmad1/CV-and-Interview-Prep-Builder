import React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Intelligence Studio",
  description: "Enterprise Production AI Resume Optimisation & Mock Interview Coaching Platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="gradient-bg-purple min-h-screen flex text-slate-100 antialiased selection:bg-purple-500 selection:text-white">
        {/* Navigation Sidebar Panel */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-md flex flex-col fixed h-screen z-20">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-mono text-xs">CI</span>
              <span className="gradient-text">Studio</span>
            </h1>
            <p className="text-[10px] text-purple-400 mt-1 uppercase tracking-widest font-semibold font-mono">Enterprise AI Platform</p>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <a href="/" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>📊</span> Dashboard
            </a>
            <a href="/archive" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>📁</span> Career Documents
            </a>
            <a href="/archive?type=resumes" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>📄</span> Resume Library
            </a>
            <a href="/jd-analysis" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>🎯</span> Job Description Analyzer
            </a>
            <a href="/optimize" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>⚙️</span> CV Optimizer
            </a>
            <a href="/grounding-audit" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>🛡️</span> Grounding Auditor
            </a>
            <a href="/cover-letter" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>✉️</span> Cover Letter Generator
            </a>
            <a href="/ats-report" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>📈</span> ATS Match Report
            </a>
            <a href="/applications" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>📅</span> Application Tracker
            </a>
            <a href="/interview?mode=prep" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>💡</span> Interview Preparation
            </a>
            <a href="/interview" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>🗣️</span> Mock Interviews
            </a>
            <a href="/skills-gap" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>📊</span> Skills Gap Analysis
            </a>
            <a href="/learning" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>🎓</span> Learning Recommendations
            </a>
            <a href="/saved-applications" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
              <span>⭐</span> Saved Applications
            </a>
            <a href="/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all">
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

        {/* Main Content Layout Wrapper */}
        <main className="flex-1 pl-64 min-h-screen flex flex-col relative z-10">
          <header className="h-16 border-b border-slate-800 bg-slate-950/20 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>ENV: development</span>
              <span className="text-slate-700">|</span>
              <span className="text-purple-400">Gateway: Active</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animated-pulse-ring"></span>
                Local Security RLS Isolated
              </button>
            </div>
          </header>
          <div className="flex-1 p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
