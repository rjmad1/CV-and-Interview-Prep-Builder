"use client";

import React, { useState, useEffect } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"mock" | "direct">("mock");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // 1. Check local storage
      const onboardingDone = localStorage.getItem("onboarding_completed");
      if (onboardingDone === "true") {
        return;
      }

      // 2. Fallback to check backend status
      try {
        const res = await fetch(`${API_URL}/settings/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.api_key_configured) {
            localStorage.setItem("onboarding_completed", "true");
            localStorage.setItem("gateway_mode", data.ai_gateway_mode || "direct");
            return;
          }
        }
      } catch (err) {
        console.error("Backend status check failed during onboarding check:", err);
      }

      // If neither is true, trigger modal
      setIsOpen(true);
    };

    checkOnboardingStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "direct" && !apiKey.trim()) {
      setError("Please provide a valid NVIDIA API Key to use Live Mode.");
      return;
    }

    setSaving(true);
    try {
      // Save locally to browser
      localStorage.setItem("gateway_mode", mode);
      localStorage.setItem("nvidia_api_key", apiKey);
      localStorage.setItem("onboarding_completed", "true");

      // Save to local server
      const res = await fetch(`${API_URL}/settings/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-NVIDIA-API-Key": apiKey,
          "X-AI-Gateway-Mode": mode,
        },
        body: JSON.stringify({
          nvidia_api_key: apiKey,
          ai_gateway_mode: mode,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        // Force refresh store state or layout environment indicator
        window.location.reload();
      } else {
        // Even if backend fails (offline dev server), we let them through since they have local storage
        setIsOpen(false);
      }
    } catch (err) {
      console.error(err);
      // Let client proceed locally if server is temporarily offline
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-3 relative z-10">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-purple-500/20">
            CI
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Welcome to Career Intelligence Studio</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Configure your AI orchestration engine. Choose between running locally offline with simulated responses, or using live NVIDIA NIM endpoints.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 relative z-10">
          
          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Mock Mode Card */}
            <div 
              onClick={() => { setMode("mock"); setError(""); }}
              className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 ${
                mode === "mock" 
                  ? "bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-500/5" 
                  : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <h4 className="text-xs font-bold text-white">Local Mock Mode</h4>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Offline structured simulation. Instant responses without requiring external keys or network connections.
              </p>
            </div>

            {/* Live NIM Card */}
            <div 
              onClick={() => setMode("direct")}
              className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 ${
                mode === "direct" 
                  ? "bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-500/5" 
                  : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🟢</span>
                <h4 className="text-xs font-bold text-white">NVIDIA NIM SDK</h4>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Production-grade live inference. Uses Llama-3.1-Nemotron models and high-performance vector embeddings.
              </p>
            </div>

          </div>

          {/* Secret Key Input if Live Mode */}
          {mode === "direct" && (
            <div className="space-y-2 animate-slide-down">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-200">NVIDIA API Key</label>
                <a 
                  href="https://build.nvidia.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-purple-400 hover:underline"
                >
                  Get API Key →
                </a>
              </div>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="nvapi-..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30"
              />
              <p className="text-[9px] text-slate-500">
                Your key is stored locally in your browser and on your machine's local configuration file. It is never shared with third-party servers.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              ⚠️ {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-lg shadow-purple-600/10 flex items-center justify-center"
            >
              {saving ? "Configuring Engine..." : "Complete Setup & Launch"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
