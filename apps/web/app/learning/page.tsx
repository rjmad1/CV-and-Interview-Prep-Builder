"use client";

import React from "react";

export default function LearningRecommendationsPage() {
  const recommendations = [
    { title: "Next.js 15 Foundations & React 19 Core Patterns", provider: "Vercel / Frontend Masters", duration: "12 hours", target: "Bridges Next.js 15 Gap", link: "#" },
    { title: "Distributed Tracing with OpenTelemetry and Jaeger", provider: "CNCF / Linux Foundation", duration: "8 hours", target: "Bridges Observability Gap", link: "#" },
    { title: "Kubernetes Production Grade Cluster Orchestration", provider: "Udemy / KubeAcademy", duration: "24 hours", target: "Bridges DevOps Orchestration Gap", link: "#" }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white">Learning Recommendations</h1>
        <p className="text-xs text-slate-400 mt-1">Recommended courses, reference guides, and documentation paths to resolve identified experience and technical skill gaps.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">Recommended Skill Upgrades</h3>
        
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="border border-slate-900 bg-slate-950/30 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between hover:border-purple-500/30 transition-all gap-4">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950/50 text-purple-400 border border-purple-900/50">
                  {rec.target}
                </span>
                <h4 className="text-sm font-bold text-slate-200 pt-1">{rec.title}</h4>
                <p className="text-xs text-slate-500">{rec.provider} | Duration: {rec.duration}</p>
              </div>

              <a
                href={rec.link}
                className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-center"
              >
                View Material
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
