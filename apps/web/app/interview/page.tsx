"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCISStore } from "../store";
import Link from "next/link";

function InterviewContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode"); // "prep" or null/coach

  const {
    applications,
    prepCards,
    interview,
    loading,
    error,
    fetchApplications,
    fetchPrepCards,
    startInterview,
    submitInterviewResponse
  } = useCISStore();

  const [selectedAppId, setSelectedAppId] = useState("");
  const [userResponse, setUserResponse] = useState("");
  const [flippedCardIndex, setFlippedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handle application select change
  useEffect(() => {
    if (selectedAppId && mode === "prep") {
      const app = applications.find((a) => a.id === selectedAppId);
      if (app) {
        fetchPrepCards(app.jd_id, app.resume_version_id);
      }
    }
  }, [selectedAppId, mode, applications, fetchPrepCards]);

  const handleStartMock = async () => {
    if (!selectedAppId) return;
    const app = applications.find((a) => a.id === selectedAppId);
    if (app) {
      await startInterview(app.resume_version_id, app.jd_id);
    }
  };

  const handleSubmitMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userResponse.trim() || loading) return;
    await submitInterviewResponse(userResponse);
    setUserResponse("");
  };

  // 1. Render Interview Prep/Assistant View
  if (mode === "prep") {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Interview Preparation Assistant</h2>
            <p className="text-xs text-slate-400">
              Prepare for your interviews with STAR stories, technical flashcards, and behavioral advice grounded in your profile.
            </p>
          </div>
          <Link
            href="/interview"
            className="px-4 py-2 font-bold text-white rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all text-xs"
          >
            🗣️ Go to Mock Coach
          </Link>
        </div>

        {/* Dropdown to select application */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-900 bg-slate-950/40 max-w-md">
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
            Select Active Job Application
          </label>
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">-- Choose Job Application --</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.title} at {app.company} ({app.status})
              </option>
            ))}
          </select>
        </div>

        {selectedAppId && prepCards && (
          <div className="space-y-8 animate-fade-in">
            {/* STAR Story Matrix */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                🌌 STAR Story Matrix
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {prepCards.star_stories?.map((story: any, idx: number) => (
                  <div
                    key={idx}
                    className="glass-panel p-6 rounded-2xl border border-slate-900 bg-slate-950/20 space-y-4"
                  >
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest font-mono">
                      STAR Story Map #{idx + 1}
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-300 uppercase text-[9px] tracking-wide block">Situation</span>
                        <p className="text-slate-400 mt-0.5">{story.situation}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-300 uppercase text-[9px] tracking-wide block">Task</span>
                        <p className="text-slate-400 mt-0.5">{story.task}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-300 uppercase text-[9px] tracking-wide block">Action</span>
                        <p className="text-slate-400 mt-0.5">{story.action}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-300 uppercase text-[9px] tracking-wide block">Result</span>
                        <p className="text-slate-400 mt-0.5">{story.result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Flashcards */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                ⚡ Technical Prep Flashcards
              </h3>
              <p className="text-[10px] text-slate-500">Click a card to flip it and reveal the answer.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {prepCards.technical_flashcards?.map((card: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setFlippedCardIndex(flippedCardIndex === idx ? null : idx)}
                    style={{ perspective: "1000px", height: "220px" }}
                    className="select-none"
                  >
                    <div
                      style={{
                        transition: "transform 0.6s",
                        transformStyle: "preserve-3d",
                        transform: flippedCardIndex === idx ? "rotateY(180deg)" : "rotateY(0deg)",
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        cursor: "pointer"
                      }}
                    >
                      {/* Front of Card */}
                      <div
                        className="glass-panel p-6 rounded-2xl border border-slate-900 bg-slate-950/80 flex flex-col justify-between"
                        style={{
                          backfaceVisibility: "hidden",
                          position: "absolute",
                          width: "100%",
                          height: "100%",
                          left: 0,
                          top: 0
                        }}
                      >
                        <div>
                          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider font-mono">
                            Technical Q&A
                          </span>
                          <h4 className="text-xs font-semibold text-slate-200 leading-relaxed mt-2">
                            {card.question}
                          </h4>
                        </div>
                        <span className="text-[9px] text-slate-500 text-right">⚡ Tap to Flip</span>
                      </div>

                      {/* Back of Card */}
                      <div
                        className="glass-panel p-6 rounded-2xl border border-purple-900/50 bg-slate-950/90 flex flex-col justify-between"
                        style={{
                          backfaceVisibility: "hidden",
                          position: "absolute",
                          width: "100%",
                          height: "100%",
                          left: 0,
                          top: 0,
                          transform: "rotateY(180deg)"
                        }}
                      >
                        <div>
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                            Answer / Grounding Reference
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed mt-2">
                            {card.answer}
                          </p>
                        </div>
                        <span className="text-[9px] text-slate-500 text-right">⚡ Tap to Flip</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Behavioral Tips */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-900 bg-slate-950/20 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                💡 Behavioral Prep Tips
              </h3>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-350 leading-relaxed">
                {prepCards.behavioral_tips?.map((tip: string, idx: number) => (
                  <li key={idx} className="marker:text-purple-500 pl-1">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {selectedAppId && loading && (
          <p className="text-xs text-slate-500 italic">Generating preparation package...</p>
        )}

        {!selectedAppId && (
          <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl max-w-3xl">
            <span className="text-3xl">💡</span>
            <p className="text-xs mt-2 font-mono">Select a job application above to load your prep card deck.</p>
          </div>
        )}
      </div>
    );
  }

  // 2. Render Mock Interview Coach View (Default)
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Mock Interview Coach Simulator</h2>
          <p className="text-xs text-slate-400">
            Practice behavioral and technical questions generated by Nemotron NIM, grounded strictly in your verified project evidence.
          </p>
        </div>
        <Link
          href="/interview?mode=prep"
          className="px-4 py-2 font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all text-xs"
        >
          💡 Go to Prep Assistant
        </Link>
      </div>

      {!interview ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px] border border-slate-900 bg-slate-950/40">
          <span className="text-4xl mb-4">🗣️</span>
          <h3 className="text-md font-bold text-slate-300">Start Grounded Mock Interview</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-2 mb-6">
            Choose one of your active job applications to tailor the interview to that specific target role.
          </p>

          <div className="w-full max-w-xs space-y-4 mb-6">
            <label className="text-[10px] uppercase font-bold text-slate-400 block text-left">
              Select Target Application
            </label>
            <select
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

          <button
            onClick={handleStartMock}
            disabled={!selectedAppId || loading}
            className="px-6 py-2.5 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 glow-button animate-pulse"
          >
            {loading ? "Starting Session..." : "Start Mock Session"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left/Middle Column: Question & Response Panel */}
          <div className="md:col-span-2 space-y-6">
            {!interview.completed ? (
              <div className="glass-panel p-6 rounded-2xl space-y-6 border border-slate-900 bg-slate-950/40">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <span className="text-xs font-bold text-purple-400 font-mono uppercase">
                    Question {interview.question_number} of 3
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animated-pulse-ring"></span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-900 text-slate-200 text-sm font-semibold leading-relaxed">
                    {interview.active_question}
                  </div>

                  {interview.coaching_tips && (
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900 text-purple-300 text-xs leading-relaxed space-y-1">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wider">
                        <span>💡</span> Coaching Tip (Previous Answer)
                      </div>
                      <p>{interview.coaching_tips}</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmitMock} className="space-y-4">
                  <textarea
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    placeholder="Type your response here. Try to describe your methodology and refer to your achievements..."
                    rows={6}
                    className="w-full bg-slate-950/50 rounded-xl border border-slate-800 p-4 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !userResponse.trim()}
                      className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 glow-button"
                    >
                      {loading ? "Evaluating..." : "Submit Answer"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Interview Completed: Final Report Details */
              <div className="glass-panel p-6 rounded-2xl space-y-6 border border-slate-900 bg-slate-950/40">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <h3 className="text-md font-bold text-white">Interview Readiness Evaluation</h3>
                  <span className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-900 px-3 py-1 rounded">
                    Completed
                  </span>
                </div>

                {interview.report ? (
                  <div className="space-y-6 text-xs">
                    <div className="flex justify-between items-center p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                      <div>
                        <h4 className="font-bold text-slate-300 text-sm">Readiness Score</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Based on Nemotron coach audits</p>
                      </div>
                      <span className="text-3xl font-black text-purple-400">
                        {interview.report.readiness_score}%
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] mb-2">Key Strengths</h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                          {interview.report.key_strengths.map((str, idx) => (
                            <li key={idx}>{str}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[10px] mb-2">Improvement Gaps</h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                          {interview.report.improvement_areas.map((gap, idx) => (
                            <li key={idx}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Compiling performance score report...</p>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Live Transcript / Session Audit Metadata */}
          <div className="glass-panel p-6 rounded-2xl space-y-6 border border-slate-900 bg-slate-950/40">
            <h3 className="text-sm font-bold text-slate-200">Session Transcript Logs</h3>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 text-xs">
              {interview.report?.transcript.map((line, idx) => (
                <div key={idx} className="p-3 bg-slate-900/40 border border-slate-900 rounded-lg space-y-1">
                  <p
                    className={`font-mono text-[9px] uppercase tracking-wider ${
                      line.speaker === "Interviewer" ? "text-purple-400" : "text-blue-400"
                    }`}
                  >
                    {line.speaker}
                  </p>
                  <p className="text-slate-300 italic">"{line.text}"</p>
                </div>
              ))}

              {!interview.report && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Simulating interactive chat. Submitting answers logs dialog rows here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="text-xs text-slate-500 font-mono">Loading interview session...</div>}>
      <InterviewContent />
    </Suspense>
  );
}
