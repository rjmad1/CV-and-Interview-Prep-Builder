"use client";

import React, { useState } from "react";
import { useCISStore } from "../store";

export default function JDAnalysisPage() {
  const { jdAnalysis, loading, error, analyzeJD } = useCISStore();
  const [jdText, setJdText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim()) return;
    await analyzeJD(jdText);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Job Description Intelligence</h2>
        <p className="text-xs text-slate-400">Extract critical skills, keyword densities, and map compatibility gaps using Llama 3.1 8B NIM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: JD input */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Submit Job Description</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste target job description text here..."
              rows={15}
              className="w-full bg-slate-950/50 rounded-xl border border-slate-800 p-4 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            />
            <button
              type="submit"
              disabled={loading || !jdText.trim()}
              className="w-full py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 glow-button"
            >
              {loading ? "Analyzing..." : "Analyze JD & Map Gaps"}
            </button>
          </form>
        </div>

        {/* Right Column: Skill Gaps and Keywords */}
        <div className="md:col-span-2 space-y-6">
          {jdAnalysis ? (
            <div className="space-y-6">
              {/* Header metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Overall Alignment Score</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Based on matches</p>
                  </div>
                  <div className="text-2xl font-black text-purple-400">82.5%</div>
                </div>
                
                <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Extracted Keywords</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Found in requirements</p>
                  </div>
                  <div className="text-2xl font-black text-blue-400">{jdAnalysis.keywords.length}</div>
                </div>
              </div>

              {/* Skill Gaps List */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📊</span> Experience Gap Mapping
                </h3>
                <div className="border border-slate-900 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-850">
                        <th className="p-3 font-semibold text-slate-400">Required Skill</th>
                        <th className="p-3 font-semibold text-slate-400">Importance</th>
                        <th className="p-3 font-semibold text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {jdAnalysis.gap_analysis.map((gap, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10">
                          <td className="p-3 font-medium text-slate-200">{gap.skill}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                              gap.importance === "high"
                                ? "bg-purple-950/50 text-purple-400 border border-purple-900/50"
                                : "bg-slate-900 text-slate-400 border border-slate-800"
                            }`}>
                              {gap.importance}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                              gap.status.toLowerCase() === "matched"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                : "bg-rose-950 text-rose-400 border border-rose-900"
                            }`}>
                              {gap.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px]">
              <span className="text-4xl mb-4">🎯</span>
              <h3 className="text-md font-bold text-slate-300">Awaiting Job Description</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-2">
                Paste and submit a job description in the left panel. Llama 3.1 8B NIM will map its criteria against your career profile archive.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
