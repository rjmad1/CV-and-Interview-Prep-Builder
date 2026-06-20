"use client";

import React from "react";

export default function SavedApplicationsPage() {
  const savedJobs = [
    { title: "Senior AI Architect", company: "NVIDIA", location: "Santa Clara, CA (Hybrid)", date: "2026-06-12", link: "#", match: "82%" },
    { title: "Staff Backend Engineer", company: "OpenAI", location: "San Francisco, CA (Onsite)", date: "2026-06-15", link: "#", match: "91%" }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white">Saved Applications</h1>
        <p className="text-xs text-slate-400 mt-1">Manage, bookmark, and queue target roles from various job boards to analyze gap metrics.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center pb-2">
          <h3 className="text-sm font-bold text-white">Saved Opportunities</h3>
          <span className="text-xs text-slate-400">{savedJobs.length} Positions Bookmarked</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedJobs.map((job, idx) => (
            <div key={idx} className="border border-slate-900 bg-slate-950/30 p-5 rounded-xl flex flex-col justify-between hover:border-purple-500/30 transition-all">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{job.title}</h4>
                    <p className="text-xs text-purple-400 font-semibold">{job.company}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900/50 px-2 py-0.5 rounded">
                    {job.match} Match
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">{job.location}</p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-900/50 mt-4 text-[10px]">
                <span className="text-slate-500">Saved: {job.date}</span>
                <div className="flex gap-2">
                  <a href="/jd-analysis" className="px-3 py-1 bg-purple-950 text-purple-400 border border-purple-900 rounded hover:bg-purple-900 hover:text-white transition-all">
                    Analyze JD
                  </a>
                  <a href={job.link} className="px-3 py-1 bg-slate-900 text-slate-350 border border-slate-800 rounded hover:bg-slate-800 hover:text-white transition-all">
                    External Link
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
