"use client";

import React from "react";

export default function SkillsGapPage() {
  const missingSkills = [
    { name: "Next.js 15 & React 19 Server Components", type: "Frontend", importance: "high", gap: "No project references found in current profile" },
    { name: "Kubernetes Orchestration & Helm Chart Management", type: "DevOps", importance: "medium", gap: "Basic knowledge; needs project experience proof" },
    { name: "OpenTelemetry tracing & Jaeger dashboards", type: "Observability", importance: "medium", gap: "No corporate experience mapped in resume" }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Skills Gap Analysis</h2>
        <p className="text-xs text-slate-400 mt-1">Identify specific technical skills, domain achievements, and certifications required to maximize compatibility.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Gaps Tracked</h4>
            <p className="text-2xl font-black text-purple-400 mt-1">{missingSkills.length}</p>
          </div>
          <span className="text-3xl">📊</span>
        </div>

        <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">High Importance Gaps</h4>
            <p className="text-2xl font-black text-rose-400 mt-1">1</p>
          </div>
          <span className="text-3xl">⚠️</span>
        </div>

        <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Matched Credentials</h4>
            <p className="text-2xl font-black text-emerald-400 mt-1">8</p>
          </div>
          <span className="text-3xl">✅</span>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">Critical Gaps Matrix</h3>
        <div className="border border-slate-900 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-850">
                <th className="p-3 font-semibold text-slate-400">Required Competency</th>
                <th className="p-3 font-semibold text-slate-400">Domain</th>
                <th className="p-3 font-semibold text-slate-400">Importance</th>
                <th className="p-3 font-semibold text-slate-400">Gap Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {missingSkills.map((skill, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10">
                  <td className="p-3 font-medium text-slate-200">{skill.name}</td>
                  <td className="p-3 text-slate-400">{skill.type}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                      skill.importance === "high"
                        ? "bg-rose-950/50 text-rose-400 border border-rose-900/50"
                        : "bg-slate-900 text-slate-400 border border-slate-800"
                    }`}>
                      {skill.importance}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{skill.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
