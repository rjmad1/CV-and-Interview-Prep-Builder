"use client";

import React, { useState } from "react";

export default function SettingsPage() {
  const [gatewayMode, setGatewayMode] = useState("mock");
  const [apiKey, setApiKey] = useState("••••••••••••••••••••••••••••");

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">System Settings</h2>
        <p className="text-xs text-slate-400 mt-1">Configure backend environment connections, model credentials, and local execution overrides.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl max-w-2xl space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-slate-900 pb-3">AI Engine Configuration</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <label className="text-xs font-semibold text-slate-200">AI Gateway Mode</label>
              <p className="text-[10px] text-slate-500 max-w-sm">Switch between mock response generation and direct live NVIDIA NIM connections.</p>
            </div>
            <select
              value={gatewayMode}
              onChange={(e) => setGatewayMode(e.target.value)}
              className="bg-slate-950 rounded-lg border border-slate-800 p-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50"
            >
              <option value="mock">Local Mock Mode</option>
              <option value="direct">NVIDIA NIM SDK (Live)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">NVIDIA API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="nvapi-..."
              className="w-full bg-slate-950/50 rounded-lg border border-slate-800 p-2.5 text-xs text-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            />
            <p className="text-[9px] text-slate-650">Keys are isolated locally and never sent to cloud servers unless using live modes.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-900 flex justify-end">
          <button className="px-4 py-2 text-xs font-bold text-white rounded-lg bg-purple-600 hover:bg-purple-500 transition-all">
            Save Config
          </button>
        </div>
      </div>
    </div>
  );
}
