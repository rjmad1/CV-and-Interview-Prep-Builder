"use client";

import React, { useEffect, useState } from "react";
import { useCISStore } from "../store";
import Link from "next/link";

export default function CoverLetterPage() {
  const {
    coverLetter,
    jdsList,
    resumeVersionsList,
    loading,
    error,
    fetchJDsList,
    fetchResumeVersionsList,
    generateCoverLetter
  } = useCISStore();

  const [copied, setCopied] = useState(false);
  const [selectedJD, setSelectedJD] = useState("");
  const [selectedResume, setSelectedResume] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    fetchJDsList();
    fetchResumeVersionsList();
  }, [fetchJDsList, fetchResumeVersionsList]);

  const handleGenerate = async () => {
    if (!selectedJD || !selectedResume) return;
    setLocalError(null);
    try {
      await generateCoverLetter(selectedJD, selectedResume);
    } catch (err: any) {
      setLocalError(err.message || "Generation failed");
    }
  };

  const handleCopy = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white font-sans">Cover Letter Generator</h2>
        <p className="text-xs text-slate-400 mt-1">
          Generate highly personalized, evidence-grounded cover letters tailored to target job descriptions.
        </p>
      </div>

      {localError && (
        <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-300 space-y-2">
          <p className="font-bold">⚠️ Anti-Hallucination Block Alert</p>
          <p>{localError}</p>
          <p>
            Please review the generated claims in the{" "}
            <Link href="/grounding-audit" className="underline font-bold text-rose-400 hover:text-rose-350">
              Grounding Auditor
            </Link>{" "}
            to see the blocked statements and provide override justifications.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-4 h-fit border border-slate-900 bg-slate-950/40">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Tailoring Context</h3>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-semibold text-slate-500">Target Job Description</label>
            <select
              value={selectedJD}
              onChange={(e) => setSelectedJD(e.target.value)}
              className="w-full bg-slate-950 rounded-lg border border-slate-900 p-2.5 text-xs text-slate-350 focus:outline-none focus:border-purple-500/50"
              required
            >
              <option value="">-- Select analyzed Job Description --</option>
              {jdsList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} at {j.company}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-semibold text-slate-500">Grounding Source (Resume)</label>
            <select
              value={selectedResume}
              onChange={(e) => setSelectedResume(e.target.value)}
              className="w-full bg-slate-950 rounded-lg border border-slate-900 p-2.5 text-xs text-slate-350 focus:outline-none focus:border-purple-500/50"
              required
            >
              <option value="">-- Select generated resume version --</option>
              {resumeVersionsList.map((r) => (
                <option key={r.id} value={r.id}>
                  v{r.version_number} - {r.jd_title ? `${r.jd_title} (${r.jd_company})` : "General"}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !selectedJD || !selectedResume}
            className="w-full py-2.5 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all glow-button disabled:opacity-50"
          >
            {loading ? "Generating letter..." : "Generate Cover Letter"}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {coverLetter && !loading ? (
            <div className="glass-panel p-6 rounded-2xl space-y-4 relative border border-slate-900 bg-slate-950/40">
              <div className="flex justify-between items-center pb-4 border-b border-slate-900">
                <span className="text-xs font-semibold text-purple-400">
                  Generated Cover Letter (Verified Grounded)
                </span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-900 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all"
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </button>
              </div>
              <pre className="text-xs text-slate-350 whitespace-pre-wrap font-sans leading-relaxed pt-2">
                {coverLetter}
              </pre>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[350px] border border-slate-900 bg-slate-950/40">
              <span className="text-4xl mb-4">✉️</span>
              <h3 className="text-md font-bold text-slate-300">Generate Cover Letter</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-2">
                Click generate to draft a cover letter matching your profile credentials and verified history with the job requirements.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
