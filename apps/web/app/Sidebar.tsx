"use client";

import React, { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = (href: string) => {
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      if (pathname !== path) return false;
      const params = new URLSearchParams(query);
      for (const [key, value] of params.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    
    if (href === "/interview") {
      return pathname === "/interview" && !searchParams.has("mode");
    }
    if (href === "/archive") {
      return pathname === "/archive" && searchParams.get("type") !== "resumes";
    }

    return pathname === href;
  };

  const navLinkClass = (href: string) => {
    const active = isActive(href);
    return `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-full ${
      active
        ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)] font-semibold"
        : "text-slate-300 hover:text-white hover:bg-[var(--md-sys-color-surface-container)]"
    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]`;
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden h-16 border-b border-[var(--md-sys-color-outline)]/30 bg-[var(--md-sys-color-surface-container-high)]/90 backdrop-blur-md flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-30">
        <h1 className="text-md font-extrabold tracking-tight flex items-center gap-2">
          <span className="p-1 rounded bg-gradient-to-br from-[var(--md-sys-color-primary)] to-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary)] font-mono text-[10px]">CI</span>
          <span className="text-[var(--md-sys-color-primary)] font-bold">Studio</span>
        </h1>
        <button
          id="mobile-menu-toggle"
          onClick={() => setOpen(!open)}
          className="p-2 text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] rounded"
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
        className={`w-64 border-r border-[var(--md-sys-color-outline)]/30 bg-[var(--md-sys-color-surface-container-high)] flex flex-col fixed h-screen z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-[var(--md-sys-color-outline)]/20 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-mono text-xs">CI</span>
              <span className="text-[var(--md-sys-color-primary)] font-bold">Studio</span>
            </h1>
            <p className="text-[10px] text-[var(--md-sys-color-primary)] mt-1 uppercase tracking-widest font-semibold font-mono opacity-80">Enterprise AI Platform</p>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] rounded"
            aria-label="Close Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--md-sys-color-outline)]/20">
          <a
            href="/"
            onClick={() => setOpen(false)}
            className={navLinkClass("/")}
          >
            <span>📊</span> Dashboard
          </a>
          <a
            href="/archive"
            onClick={() => setOpen(false)}
            className={navLinkClass("/archive")}
          >
            <span>📁</span> Career Documents
          </a>
          <a
            href="/archive?type=resumes"
            onClick={() => setOpen(false)}
            className={navLinkClass("/archive?type=resumes")}
          >
            <span>📄</span> Resume Library
          </a>
          <a
            href="/jd-analysis"
            onClick={() => setOpen(false)}
            className={navLinkClass("/jd-analysis")}
          >
            <span>🎯</span> Job Description Analyzer
          </a>
          <a
            href="/optimize"
            onClick={() => setOpen(false)}
            className={navLinkClass("/optimize")}
          >
            <span>⚙️</span> CV Optimizer
          </a>
          <a
            href="/grounding-audit"
            onClick={() => setOpen(false)}
            className={navLinkClass("/grounding-audit")}
          >
            <span>🛡️</span> Grounding Auditor
          </a>
          <a
            href="/cover-letter"
            onClick={() => setOpen(false)}
            className={navLinkClass("/cover-letter")}
          >
            <span>✉️</span> Cover Letter Generator
          </a>
          <a
            href="/ats-report"
            onClick={() => setOpen(false)}
            className={navLinkClass("/ats-report")}
          >
            <span>📈</span> ATS Match Report
          </a>
          <a
            href="/applications"
            onClick={() => setOpen(false)}
            className={navLinkClass("/applications")}
          >
            <span>📅</span> Application Tracker
          </a>
          <a
            href="/interview?mode=prep"
            onClick={() => setOpen(false)}
            className={navLinkClass("/interview?mode=prep")}
          >
            <span>💡</span> Interview Preparation
          </a>
          <a
            href="/interview"
            onClick={() => setOpen(false)}
            className={navLinkClass("/interview")}
          >
            <span>🗣️</span> Mock Interviews
          </a>
          <a
            href="/skills-gap"
            onClick={() => setOpen(false)}
            className={navLinkClass("/skills-gap")}
          >
            <span>📊</span> Skills Gap Analysis
          </a>
          <a
            href="/learning"
            onClick={() => setOpen(false)}
            className={navLinkClass("/learning")}
          >
            <span>🎓</span> Learning Recommendations
          </a>
          <a
            href="/saved-applications"
            onClick={() => setOpen(false)}
            className={navLinkClass("/saved-applications")}
          >
            <span>⭐</span> Saved Applications
          </a>
          <a
            href="/settings"
            onClick={() => setOpen(false)}
            className={navLinkClass("/settings")}
          >
            <span>🛠️</span> Settings
          </a>
        </nav>

        <div className="p-6 border-t border-[var(--md-sys-color-outline)]/20 bg-[var(--md-sys-color-surface-container-high)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)] flex items-center justify-center font-bold text-xs">
              LA
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Staff Architect</p>
              <p className="text-[10px] text-slate-400">developer@cis.internal</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
