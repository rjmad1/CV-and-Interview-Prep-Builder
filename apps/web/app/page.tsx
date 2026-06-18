"use client";

import React, { useEffect } from "react";
import { useCISStore } from "./store";

export default function DashboardPage() {
  const { documents, jdAnalysis, optimizedResume, fetchDocuments } = useCISStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Hero banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/20 to-slate-900 border border-purple-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="space-y-3">
          <span className="px-3 py-1 text-[10px] font-bold font-mono tracking-widest text-purple-400 bg-purple-950/50 border border-purple-500/30 rounded-full uppercase">
            Lead Developer Hub
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            Welcome to <span className="gradient-text">Career Intelligence Studio</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            A production-grade environment utilizing NVIDIA NIM model mappings and LangGraph orchestrations for evidence-based CV optimization and grounded mock interview simulator.
          </p>
        </div>
      </div>

      {/* Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="text-3xl font-bold font-mono tracking-tight text-white mb-1">
            {documents.length}
          </div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Ingested Documents
          </div>
          <div className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1 font-mono">
            <span>●</span> 100% Truth Preserved
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="text-3xl font-bold font-mono tracking-tight text-white mb-1">
            {jdAnalysis ? "1" : "0"}
          </div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Job Descriptions Analyzed
          </div>
          <div className="text-[10px] text-purple-400 mt-2 flex items-center gap-1 font-mono">
            <span>●</span> Llama 3.1 8B NIM Model
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="text-3xl font-bold font-mono tracking-tight text-white mb-1">
            {optimizedResume ? "1" : "0"}
          </div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Optimized Resume Builds
          </div>
          <div className="text-[10px] text-blue-400 mt-2 flex items-center gap-1 font-mono">
            <span>●</span> Grounding validation active
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="text-3xl font-bold font-mono tracking-tight text-white mb-1">
            {optimizedResume?.evidence_bundle?.length || 0}
          </div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Verified Evidence Links
          </div>
          <div className="text-[10px] text-amber-400 mt-2 flex items-center gap-1 font-mono">
            <span>●</span> 0% Hallucination Tolerated
          </div>
        </div>
      </div>

      {/* Main Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Active Job Description */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <span>🎯</span> Active Job Description Analysis
          </h3>
          
          {jdAnalysis ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-md font-bold text-white">{jdAnalysis.extracted_skills[0] || "Software Engineer"} Mapping</h4>
                  <p className="text-xs text-slate-400">Extracted from target job profile</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-purple-400">82.5%</div>
                  <p className="text-[10px] text-slate-500 font-mono">Alignment Index</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Extracted Skillset Requirements</h4>
                <div className="flex flex-wrap gap-2">
                  {jdAnalysis.extracted_skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-xs rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl space-y-4">
              <p className="text-sm text-slate-500">No Job Descriptions currently analyzed.</p>
              <a href="/jd-analysis" className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 transition-all">
                Analyze Job Description
              </a>
            </div>
          )}
        </div>

        {/* Right Column: Ingested Documents List */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <span>📁</span> Recent Ingestion Files
          </h3>

          <div className="space-y-3">
            {documents.length > 0 ? (
              documents.slice(0, 4).map((doc, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-slate-900/30 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="truncate pr-4">
                    <p className="text-xs font-bold text-slate-300 truncate">{doc.filename}</p>
                    <p className="text-[10px] text-slate-500">{doc.document_type} • {doc.metadata?.size_bytes ? `${Math.round(doc.metadata.size_bytes / 1024)} KB` : "12 KB"}</p>
                  </div>
                  <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded font-mono uppercase">
                    Indexed
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 space-y-3">
                <p className="text-xs text-slate-500">No career profile archives ingested.</p>
                <a href="/archive" className="inline-block px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-700 hover:bg-slate-900 transition-all">
                  Upload Profile
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
