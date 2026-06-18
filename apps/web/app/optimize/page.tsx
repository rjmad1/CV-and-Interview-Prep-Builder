"use client";

import React, { useState, useEffect } from "react";
import { useCISStore } from "../store";

export default function OptimizePage() {
  const { jdAnalysis, optimizedResume, loading, error, optimizeResume, evidenceChunks, fetchEvidenceChunks } = useCISStore();
  const [templateId] = useState("00000000-0000-0000-0000-000000000000"); // Mock default ID
  const [evidenceSelections, setEvidenceSelections] = useState<string[]>([]);
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (jdAnalysis) {
      fetchEvidenceChunks(jdAnalysis.jd_id);
    }
  }, [jdAnalysis, fetchEvidenceChunks]);

  const handleCheckboxChange = (id: string) => {
    if (evidenceSelections.includes(id)) {
      setEvidenceSelections(evidenceSelections.filter((x) => x !== id));
    } else {
      setEvidenceSelections([...evidenceSelections, id]);
    }
  };

  const handleOptimizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!jdAnalysis) return;
    
    try {
      await optimizeResume(templateId, jdAnalysis.jd_id, evidenceSelections);
    } catch (err: any) {
      setCustomError(err.message);
    }
  };

  // Helper to highlight additions and deletions in the diff
  const renderDiffLine = (line: string, idx: number) => {
    if (line.startsWith("+")) {
      return <div key={idx} className="bg-emerald-950/40 text-emerald-400 p-1 font-mono rounded">{line}</div>;
    } else if (line.startsWith("-")) {
      return <div key={idx} className="bg-rose-950/40 text-rose-400 p-1 font-mono line-through rounded">{line}</div>;
    } else if (line.startsWith("@@")) {
      return <div key={idx} className="text-slate-500 font-mono p-1 text-[10px]">{line}</div>;
    }
    return <div key={idx} className="text-slate-400 p-1 font-mono">{line}</div>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Template Preserving Resume Optimizer</h2>
        <p className="text-xs text-slate-400">Tailor specific resume sections incorporating evidence. Generation is strictly grounded and vetted by the Anti-Hallucination Framework.</p>
      </div>

      {/* Hallucination / Block Error Banner */}
      {(error || customError) && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>⚠️</span> Grounding Block: Anti-Hallucination Policy Triggered
          </div>
          <p className="text-xs">
            {error || customError || "The generator attempted to output statements unsupported by source evidence. Generation blocked; hallucination logged."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Selections & Evidence Bundle */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Target Ingest Context</h3>
            
            {jdAnalysis ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                  <p className="font-semibold text-slate-300">Target Role: {jdAnalysis.title || "Software Engineer"}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Company: {jdAnalysis.company || "Target Company"}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Verified Evidence Chunks</h4>
                  <p className="text-[10px] text-slate-500">Only selected facts will be used for tailoring. If other statements are generated, the pipeline will block.</p>
                  <div className="space-y-2">
                    {evidenceChunks.map((item) => (
                      <label key={item.chunk_id} className="flex gap-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={evidenceSelections.includes(item.chunk_id)}
                          onChange={() => handleCheckboxChange(item.chunk_id)}
                          className="mt-1 accent-purple-500"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-slate-300 text-[10px]">Evidence Fact</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-3 leading-relaxed">"{item.text_snippet}"</p>
                          <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-purple-400">
                            <span>Confidence: {Math.round(item.confidence * 100)}%</span>
                          </div>
                        </div>
                      </label>
                    ))}
                    {evidenceChunks.length === 0 && (
                      <p className="text-[10px] text-slate-500 italic text-center py-4">No verified evidence chunks matched this JD's requirements.</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleOptimizeSubmit}
                  disabled={loading}
                  className="w-full py-2 font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 glow-button"
                >
                  {loading ? "Generating groundings..." : "Optimize Resume Section"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">Please analyze a Job Description first to proceed with optimization.</p>
            )}
          </div>
        </div>

        {/* Right Column: Diff View & Evidence Audit Trails */}
        <div className="md:col-span-2 space-y-6">
          {optimizedResume ? (
            <div className="space-y-6">
              {/* Unified Diff View */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>⚙️</span> Section Tailoring Diff Preview
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded">
                    Layout Preserved
                  </span>
                </h3>
                <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl max-h-[350px] overflow-y-auto text-xs space-y-1">
                  {optimizedResume.diff ? (
                    optimizedResume.diff.split("\n").map((line, idx) => renderDiffLine(line, idx))
                  ) : (
                    <p className="text-slate-500">Diff loading...</p>
                  )}
                </div>
              </div>

              {/* Evidence Bundle Audit Trail */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🔒</span> Injected Grounding Citations
                </h3>
                <div className="space-y-3">
                  {optimizedResume.evidence_bundle.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/30 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                      <div className="text-xs">
                        <p className="font-semibold text-slate-300">Snippet Source Citation</p>
                        <p className="text-slate-400 mt-1 italic">"{item.text_snippet}"</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">Chunk ID: {item.chunk_id}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono">
                          {Math.round(item.confidence * 100)}% Match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px]">
              <span className="text-4xl mb-4">⚙️</span>
              <h3 className="text-md font-bold text-slate-300">Optimized Resume Versions</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-2">
                Configure parameters and submit optimization on the left. The system will perform AST replacements and display formatting changes here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
