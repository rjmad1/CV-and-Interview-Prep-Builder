"use client";

import React, { useState, useEffect } from "react";
import { useCISStore, HallucinationEvent } from "../store";

export default function GroundingAuditPage() {
  const {
    hallucinations,
    evidenceChunks,
    jdAnalysis,
    loading,
    error,
    fetchHallucinations,
    overrideHallucination,
    verifyClaim,
    fetchEvidenceChunks
  } = useCISStore();

  const [claimText, setClaimText] = useState("");
  const [selectedChunks, setSelectedChunks] = useState<string[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    similarity_score: number;
    matched_chunk_text: string | null;
  } | null>(null);

  const [overrideText, setOverrideText] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"logs" | "verifier">("logs");

  useEffect(() => {
    fetchHallucinations();
    if (jdAnalysis) {
      fetchEvidenceChunks(jdAnalysis.jd_id);
    }
  }, [fetchHallucinations, fetchEvidenceChunks, jdAnalysis]);

  const handleChunkToggle = (chunkId: string) => {
    if (selectedChunks.includes(chunkId)) {
      setSelectedChunks(selectedChunks.filter((id) => id !== chunkId));
    } else {
      setSelectedChunks([...selectedChunks, chunkId]);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimText.trim() || selectedChunks.length === 0) return;
    try {
      const res = await verifyClaim(claimText, selectedChunks);
      setVerificationResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOverrideSubmit = async (eventId: string) => {
    const comments = overrideText[eventId] || "";
    if (!comments.trim()) return;
    await overrideHallucination(eventId, comments);
    setOverrideText({ ...overrideText, [eventId]: "" });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Evidence Grounding & Anti-Hallucination Hub</h2>
        <p className="text-xs text-slate-400">
          Audit system-wide generation blocks, review hallucination prevention events, and manually verify statement grounding links.
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-4 border-b border-slate-800 pb-px">
        <button
          id="tab-logs-btn"
          onClick={() => setActiveTab("logs")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🚨 Hallucination Logs ({hallucinations.length})
        </button>
        <button
          id="tab-verifier-btn"
          onClick={() => setActiveTab("verifier")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "verifier"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🔍 Interactive Claim Verifier
        </button>
      </div>

      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Blocked Generations Audit Board</h3>
            <p className="text-xs text-slate-400">
              Below is a record of all text generations that were rejected by the Anti-Hallucination engine because their semantic grounding scores fell below the 80% threshold.
            </p>

            <div className="space-y-4">
              {hallucinations.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-5 rounded-xl border transition-all ${
                    ev.validation_status === "overridden"
                      ? "bg-slate-900/30 border-slate-800"
                      : "bg-rose-950/10 border-rose-900/40"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500">Event UUID: {ev.id}</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Logged: <span className="font-mono">{new Date(ev.created_at).toLocaleString()}</span>
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          ev.validation_status === "overridden"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                            : "bg-rose-950 text-rose-400 border-rose-900"
                        }`}
                      >
                        {ev.validation_status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected Text Snippet</h4>
                      <p className="p-3 bg-slate-950 rounded border border-slate-900 font-mono text-xs text-rose-300 mt-1 italic">
                        "{ev.generated_snippet}"
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Comments / Reason</h4>
                      <p className="text-xs text-slate-300 mt-1">{ev.audit_comments || "Blocked due to low semantic similarity to sources."}</p>
                    </div>

                    {ev.validation_status === "rejected" && (
                      <div className="pt-3 border-t border-slate-900/60 flex flex-col md:flex-row gap-3">
                        <input
                          id={`override-input-${ev.id}`}
                          type="text"
                          placeholder="Provide verified explanation or override reason..."
                          value={overrideText[ev.id] || ""}
                          onChange={(e) => setOverrideText({ ...overrideText, [ev.id]: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-900 focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                        />
                        <button
                          id={`override-btn-${ev.id}`}
                          onClick={() => handleOverrideSubmit(ev.id)}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition-all outline-none"
                        >
                          Override Block
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {hallucinations.length === 0 && (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-3xl">🛡️</span>
                  <p className="text-xs mt-2 font-mono">No hallucination events recorded. System is fully grounded.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "verifier" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
          {/* Form configuration */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Semantic Claim Verification</h3>
            
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Test Claim / Bullet Point</label>
                <textarea
                  id="claim-text-area"
                  rows={4}
                  placeholder="Paste manual resume modifications or bullet statements here..."
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-purple-500 rounded-xl p-3 text-xs text-white outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Grounding Context</label>
                <p className="text-[9px] text-slate-500">Pick parsed evidence blocks to cross-reference similarity.</p>
                
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {evidenceChunks.map((c) => (
                    <label
                      key={c.chunk_id}
                      className={`flex gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        selectedChunks.includes(c.chunk_id)
                          ? "bg-purple-950/20 border-purple-500/50"
                          : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedChunks.includes(c.chunk_id)}
                        onChange={() => handleChunkToggle(c.chunk_id)}
                        className="mt-0.5 accent-purple-500"
                      />
                      <div className="text-[10px]">
                        <p className="text-slate-400 font-normal leading-relaxed line-clamp-3">"{c.text_snippet}"</p>
                      </div>
                    </label>
                  ))}
                  {evidenceChunks.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic text-center py-4">No active evidence chunks loaded. Please analyze a Job Description.</p>
                  )}
                </div>
              </div>

              <button
                id="verify-submit-btn"
                type="submit"
                disabled={loading || !claimText.trim() || selectedChunks.length === 0}
                className="w-full py-2 font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 text-xs shadow-lg shadow-purple-500/10"
              >
                {loading ? "Calculating Similarity..." : "Run Grounding Check"}
              </button>
            </form>
          </div>

          {/* Results Audit Board */}
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl min-h-[400px] flex flex-col justify-between">
            {verificationResult ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">Grounding Audit Outcomes</h3>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                        verificationResult.passed
                          ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                          : "bg-rose-950 text-rose-400 border-rose-900"
                      }`}
                    >
                      {verificationResult.passed ? "✓ Grounded" : "✗ Fabricated / Weak Grounding"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Grounding Index: {(verificationResult.similarity_score * 100).toFixed(2)}% (Threshold: 80%)
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement Under Review</h4>
                    <p className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-xs italic text-slate-300 mt-1">
                      "{claimText}"
                    </p>
                  </div>

                  {verificationResult.matched_chunk_text && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closest Grounding Source MATCH</h4>
                      <p className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-xs text-slate-300 mt-1">
                        "{verificationResult.matched_chunk_text}"
                      </p>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-[11px] leading-relaxed text-slate-400">
                    {verificationResult.passed ? (
                      <p className="text-emerald-400">
                        🛡️ This claim matches the grounding source with high confidence. It is safe to merge into templates.
                      </p>
                    ) : (
                      <p className="text-rose-400">
                        ⚠️ Warning: Low similarity indicates potential embellishment or hallucination. Adjust statements to match source facts or provide an override justification in the audit logs.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <span className="text-5xl mb-4">🛡️</span>
                <h3 className="text-sm font-bold text-slate-300">Grounding Audit Engine</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-2">
                  Configure text and selected evidence on the left, then run grounding validation. The system will perform cosine alignment checks.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
