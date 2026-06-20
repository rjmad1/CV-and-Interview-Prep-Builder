"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, Bug, ShieldAlert, Zap, Layout, HelpCircle } from "lucide-react";
import { apiFetch, API_BASE } from "../api/apiFetch";

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("feature");
  const [priority, setPriority] = useState("medium");
  const [component, setComponent] = useState("Main Page");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to close on click outside
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    // Auto-collect metadata
    const metadata = {
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };

    const payload = {
      title,
      description,
      request_type: type,
      url: window.location.href,
      screen_name: document.title || "Career Studio Screen",
      component_name: component || "Page Container",
      meta_data: metadata
    };

    try {
      const res = await apiFetch(`${API_BASE}/orchestration/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to submit orchestration request to backend pipeline.");
      }

      setSuccess(true);
      setTitle("");
      setDescription("");
      setType("feature");
      setPriority("medium");
      setComponent("Main Page");
      
      // Auto close success banner after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 3000);

    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (t: string) => {
    switch (t) {
      case "bug": return <Bug className="w-4 h-4 text-rose-400" />;
      case "security": return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case "performance": return <Zap className="w-4 h-4 text-yellow-400" />;
      case "ux": return <Layout className="w-4 h-4 text-sky-400" />;
      default: return <HelpCircle className="w-4 h-4 text-violet-400" />;
    }
  };

  return (
    <div ref={widgetRef} className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600/90 to-violet-600/90 hover:from-indigo-500 hover:to-violet-500 text-white flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 border border-indigo-400/35 backdrop-blur-md animate-pulse-ring"
          aria-label="Submit developer feedback"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Expanded Modal Card */}
      {isOpen && (
        <div className="w-[380px] bg-slate-900/95 border border-slate-700/60 rounded-3xl shadow-2xl backdrop-blur-xl transition-all duration-300 transform scale-100 opacity-100 flex flex-col overflow-hidden text-slate-100">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-950/80 to-violet-950/80 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-sm tracking-wide text-indigo-200 uppercase font-mono">Developer Feedback</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-800/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          {success ? (
            <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                <Send className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-semibold text-emerald-300 mb-2">Request Processed!</h4>
              <p className="text-xs text-slate-400 px-4 leading-relaxed">
                Triage agent has successfully classified this issue and generated implementation tasks.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[460px] overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label htmlFor="feedback-title-input" className="block text-xs font-medium text-slate-400 mb-1">Issue Title / Request Summary *</label>
                <input
                  type="text"
                  id="feedback-title-input"
                  required
                  placeholder="e.g. Remove hardcoded JWT secret"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="feedback-description-textarea" className="block text-xs font-medium text-slate-400 mb-1">Detailed Description *</label>
                <textarea
                  id="feedback-description-textarea"
                  required
                  rows={3}
                  placeholder="Provide context, reproduction steps, or expected behaviors..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all resize-none"
                />
              </div>

              {/* Grid for Type and Priority */}
              <div className="grid grid-cols-2 gap-3">
                {/* Request Type */}
                <div>
                  <label htmlFor="feedback-type-select" className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                  <div className="relative">
                    <select
                      id="feedback-type-select"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 text-slate-350 text-xs rounded-xl pl-8 pr-3 py-2.5 outline-none appearance-none cursor-pointer transition-all"
                    >
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="ux">UX Enhancement</option>
                      <option value="tech_debt">Tech Debt</option>
                      <option value="performance">Performance</option>
                      <option value="security">Security Issue</option>
                    </select>
                    <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      {getIconForType(type)}
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="feedback-priority-select" className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <select
                    id="feedback-priority-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 text-slate-350 text-xs rounded-xl px-3.5 py-2.5 outline-none appearance-none cursor-pointer transition-all"
                  >
                    <option value="low">Low (Cosmetic)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (Major)</option>
                    <option value="critical">Critical (Blocker)</option>
                  </select>
                </div>
              </div>

              {/* Component Context */}
              <div>
                <label htmlFor="feedback-component-input" className="block text-xs font-medium text-slate-400 mb-1">Component / Module Name</label>
                <input
                  type="text"
                  id="feedback-component-input"
                  placeholder="e.g. sidebar, optimize-page, database"
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
                />
              </div>

              {/* Auto collected disclaimer */}
              <div className="p-2.5 bg-slate-950/30 rounded-xl border border-slate-800/40 text-[10px] text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-400">Captured Context:</span> URL, screen size, user-agent details, screen name, local timestamp.
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-indigo-400/20 shadow-md disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit to AI Orchestrator
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
