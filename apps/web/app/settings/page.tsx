"use client";

import React, { useState, useEffect } from "react";
import { apiFetch, API_BASE } from "../api/apiFetch";

const API_URL = API_BASE;

export default function SettingsPage() {
  const [gatewayMode, setGatewayMode] = useState("mock");
  const [apiKey, setApiKey] = useState("");
  const [backendConfigured, setBackendConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Load values from localStorage
    const localMode = localStorage.getItem("gateway_mode") || "mock";
    const localKey = localStorage.getItem("nvidia_api_key") || "";
    setGatewayMode(localMode);
    setApiKey(localKey);

    // Fetch backend status
    const fetchStatus = async () => {
      try {
        const res = await apiFetch(`${API_URL}/settings/status`);
        if (res.ok) {
          const data = await res.json();
          setBackendConfigured(data.api_key_configured);
          if (data.api_key_configured && !localKey) {
            setApiKey("••••••••••••••••••••••••••••");
          }
        }
      } catch (err) {
        console.error("Failed to query settings status from backend:", err);
      }
    };
    fetchStatus();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      // Update localStorage
      localStorage.setItem("gateway_mode", gatewayMode);
      localStorage.setItem("nvidia_api_key", apiKey);

      // Persist on local backend server
      const res = await apiFetch(`${API_URL}/settings/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-NVIDIA-API-Key": apiKey,
          "X-AI-Gateway-Mode": gatewayMode,
        },
        body: JSON.stringify({
          nvidia_api_key: apiKey,
          ai_gateway_mode: gatewayMode,
        }),
      });

      if (res.ok) {
        setStatusMessage({ type: "success", text: "Settings saved successfully! Locally persisted." });
        setBackendConfigured(!!apiKey && apiKey !== "••••••••••••••••••••••••••••");
      } else {
        setStatusMessage({ type: "success", text: "Saved locally. Backend synchronization is unavailable." });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: "success", text: "Saved locally. Backend synchronization is offline." });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white">System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure backend environment connections, model credentials, and local execution overrides.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl max-w-2xl space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-slate-900 pb-3">AI Engine Configuration</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <label htmlFor="gateway-mode-select" className="text-xs font-semibold text-slate-200">AI Gateway Mode</label>
              <p className="text-[10px] text-slate-500 max-w-sm">Switch between mock response generation and direct live NVIDIA NIM connections.</p>
            </div>
            <select
              id="gateway-mode-select"
              value={gatewayMode}
              onChange={(e) => setGatewayMode(e.target.value)}
              className="bg-slate-950 rounded-lg border border-slate-800 p-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50"
            >
              <option value="mock">Local Mock Mode</option>
              <option value="direct">NVIDIA NIM SDK (Live)</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="nvidia-api-key-input" className="text-xs font-semibold text-slate-200">NVIDIA API Key</label>
              {backendConfigured && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active in Server Environment
                </span>
              )}
            </div>
            <input
              type="password"
              id="nvidia-api-key-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={backendConfigured ? "••••••••••••••••••••••••••••" : "nvapi-..."}
              className="w-full bg-slate-950/50 rounded-lg border border-slate-800 p-2.5 text-xs text-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            />
            <p className="text-[9px] text-slate-500">
              Keys are isolated locally and never sent to cloud servers unless using live modes. Get yours at{" "}
              <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                NVIDIA Build
              </a>.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs border ${
            statusMessage.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {statusMessage.text}
          </div>
        )}

        <div className="pt-4 border-t border-slate-900 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-white rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {saving ? "Saving..." : "Save Config"}
          </button>
        </div>
      </div>
    </div>
  );
}
