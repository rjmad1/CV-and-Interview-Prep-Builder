"use client";

import React, { useEffect, useState } from "react";
import { useCISStore } from "../store";

export default function LearningRecommendationsPage() {
  const {
    applications,
    learningRecommendations,
    loading,
    fetchApplications,
    fetchLearningRecommendations,
  } = useCISStore();

  const [selectedAppId, setSelectedAppId] = useState("");

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    if (selectedAppId) {
      const app = applications.find((a) => a.id === selectedAppId);
      if (app) {
        fetchLearningRecommendations(app.jd_id);
      }
    }
  }, [selectedAppId, applications, fetchLearningRecommendations]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <span>🎓</span> Learning Upgrades
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Explore personalized courses, books, and reference documentation paths matching your target job's skill gaps.
        </p>
      </div>

      {/* Selector Area */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-900 bg-slate-950/40 max-w-md space-y-2">
        <label htmlFor="learning-app-select" className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
          Select Active Job Application
        </label>
        <select
          id="learning-app-select"
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50"
        >
          <option value="">-- Choose Job Application --</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.title} at {app.company}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      {selectedAppId ? (
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900/60">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recommended Skill Upgrades
            </h3>
            <span className="text-xs text-slate-400">
              {loading ? "Aligning..." : `${learningRecommendations.length} Dynamic Recommendations`}
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono animate-pulse">
              Generating recommendations matching target gap metrics...
            </div>
          ) : (
            <div className="space-y-4">
              {learningRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="border border-slate-900 bg-slate-950/30 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between hover:border-purple-500/30 transition-all gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950/50 text-purple-400 border border-purple-900/50">
                      {rec.target}
                    </span>
                    <h4 className="text-sm font-bold text-slate-200 pt-1">{rec.title}</h4>
                    <p className="text-xs text-slate-500">
                      {rec.provider} | Duration: {rec.duration}
                    </p>
                  </div>

                  <a
                    href={rec.link}
                    className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-center self-start md:self-auto"
                  >
                    View Material
                  </a>
                </div>
              ))}

              {learningRecommendations.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500 italic">
                  No explicit skill gaps identified for this job application. Keep practicing mock sessions!
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500 border border-dashed border-slate-850 rounded-2xl max-w-3xl">
          <span className="text-4xl">🎓</span>
          <h3 className="text-sm font-bold text-slate-400 mt-2">Personalized Recommendation Deck</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
            Please choose one of your active job applications in the dropdown above to load customized skill upgrades.
          </p>
        </div>
      )}
    </div>
  );
}
