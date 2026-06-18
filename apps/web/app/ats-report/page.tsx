"use client";

import React, { useEffect, useState } from "react";
import { useCISStore } from "../store";

export default function ATSReportPage() {
  const { optimizedResume, jdAnalysis, atsReport, loading, fetchATSReport, optimizeResumeATS } = useCISStore();
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    if (optimizedResume && !atsReport) {
      fetchATSReport(optimizedResume.resume_id);
    }
  }, [optimizedResume, atsReport, fetchATSReport]);

  const handleATSOptimize = async () => {
    if (!optimizedResume || !jdAnalysis) return;
    setOptimizing(true);
    try {
      await optimizeResumeATS(optimizedResume.resume_id, jdAnalysis.jd_id);
    } catch (err) {
      console.error(err);
    } finally {
      setOptimizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-900 bg-emerald-950/20";
    if (score >= 60) return "text-amber-400 border-amber-900 bg-amber-950/20";
    return "text-rose-400 border-rose-900 bg-rose-950/20";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">ATS Explainability Report</h2>
          <p className="text-xs text-slate-400">Review detailed compatibility metrics, semantic overlap indices, and parsing readability audits.</p>
        </div>
        {optimizedResume && jdAnalysis && (
          <button
            id="ats-optimize-btn"
            onClick={handleATSOptimize}
            disabled={optimizing || loading}
            className="px-4 py-2 font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 text-xs shadow-lg shadow-purple-500/10 shrink-0 outline-none"
          >
            {optimizing ? "Optimizing Layout & Keywords..." : "✨ Optimize to Match Job Description"}
          </button>
        )}
      </div>

      {optimizedResume ? (
        <div className="space-y-8">
          {/* If loading and no report */}
          {!atsReport && loading && (
            <p className="text-xs text-slate-500">Calculating compatibility indexes...</p>
          )}

          {atsReport && (
            <div className="space-y-8">
              {/* Score Rings/Gauges */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className={`glass-panel p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${getScoreColor(atsReport.ats_score)}`}>
                  <span className="text-3xl font-black font-mono">{atsReport.ats_score}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Overall ATS Score</span>
                </div>
                
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black font-mono text-purple-400">{Math.round(atsReport.keyword_coverage * 100)}%</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Keyword Coverage</span>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black font-mono text-blue-400">{Math.round(atsReport.semantic_match * 100)}%</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Semantic Alignment</span>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black font-mono text-amber-400">{atsReport.readability_score}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Readability Index</span>
                </div>
              </div>

              {/* Rationale and Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Rationale & Readability Gaps */}
                <div className="md:col-span-2 space-y-6">
                  {/* Rationale */}
                  <div className="glass-panel p-6 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-slate-200">Compatibility Rationale</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {atsReport.detailed_findings.score_rationale}
                    </p>
                  </div>

                  {/* Readability Gaps */}
                  <div className="glass-panel p-6 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <span>🕵️</span> Readability & Structure Audits
                    </h3>
                    {atsReport.detailed_findings.readability_issues.length > 0 ? (
                      <div className="space-y-3">
                        {atsReport.detailed_findings.readability_issues.map((issue, idx) => (
                          <div key={idx} className="p-3 bg-amber-950/20 border border-amber-900/50 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                            <span>●</span> <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-400 font-mono">No readability or formatting issues identified. Excellent structure.</p>
                    )}
                  </div>
                </div>

                {/* Keywords Analysis */}
                <div className="glass-panel p-6 rounded-2xl space-y-6">
                  <h3 className="text-sm font-bold text-slate-200">Keyword Gap Matrix</h3>
                  
                  <div className="space-y-4 text-xs">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Matching Keywords</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {atsReport.detailed_findings.matching_keywords.map((kw, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/50">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-2">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {atsReport.detailed_findings.missing_keywords.map((kw, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-900/50">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px]">
          <span className="text-4xl mb-4">📈</span>
          <h3 className="text-md font-bold text-slate-300">Awaiting Optimized Resume Version</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-2">
            Please optimize a resume first. The system will load the customized profile version and perform ATS compatibility audits.
          </p>
        </div>
      )}
    </div>
  );
}
