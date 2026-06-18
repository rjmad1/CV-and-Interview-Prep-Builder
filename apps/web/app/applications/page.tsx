"use client";

import React, { useEffect, useState } from "react";
import { useCISStore, Application, InterviewRound } from "../store";

export default function ApplicationsPage() {
  const {
    applications,
    interviews,
    jdsList,
    resumeVersionsList,
    loading,
    error,
    fetchApplications,
    createApplication,
    updateApplicationStatus,
    deleteApplication,
    fetchInterviews,
    scheduleInterview,
    logOutcome,
    fetchJDsList,
    fetchResumeVersionsList
  } = useCISStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState<string | null>(null); // application ID
  const [showOutcomeModal, setShowOutcomeModal] = useState<string | null>(null); // application ID
  const [showDetailModal, setShowDetailModal] = useState<Application | null>(null);

  // Form states
  const [selectedJD, setSelectedJD] = useState("");
  const [selectedResume, setSelectedResume] = useState("");
  const [appNotes, setAppNotes] = useState("");

  const [interviewDate, setInterviewDate] = useState("");
  const [interviewRound, setInterviewRound] = useState(1);
  const [interviewerInfo, setInterviewerInfo] = useState("");

  const [outcomeType, setOutcomeType] = useState("offer");
  const [outcomeFeedback, setOutcomeFeedback] = useState("");

  useEffect(() => {
    fetchApplications();
    fetchJDsList();
    fetchResumeVersionsList();
  }, [fetchApplications, fetchJDsList, fetchResumeVersionsList]);

  // Load interviews whenever details modal or active schedule/outcome is selected
  const loadAppInterviews = async (appId: string) => {
    await fetchInterviews(appId);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJD || !selectedResume) return;
    try {
      await createApplication(selectedJD, selectedResume, appNotes);
      setShowAddModal(false);
      setSelectedJD("");
      setSelectedResume("");
      setAppNotes("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showScheduleModal || !interviewDate) return;
    try {
      await scheduleInterview(showScheduleModal, interviewDate, interviewRound, interviewerInfo);
      setShowScheduleModal(null);
      setInterviewDate("");
      setInterviewRound(1);
      setInterviewerInfo("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOutcomeModal) return;
    try {
      await logOutcome(showOutcomeModal, outcomeType, outcomeFeedback);
      setShowOutcomeModal(null);
      setOutcomeFeedback("");
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics calculations
  const appliedCount = applications.filter((a) => a.status === "applied").length;
  const interviewingCount = applications.filter((a) => a.status === "interviewing").length;
  const offeredCount = applications.filter((a) => a.status === "offered").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white font-sans">Application & Pipeline Tracker</h2>
          <p className="text-xs text-slate-400 mt-1">
            Track pipeline progress of sent job applications, scheduled interviews, and final feedback outcomes.
          </p>
        </div>
        <button
          id="add-application-btn"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all text-xs shadow-lg shadow-purple-500/10 shrink-0 outline-none"
        >
          ＋ Log New Application
        </button>
      </div>

      {/* Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
        <div className="glass-panel p-4 rounded-xl border border-slate-900">
          <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Applied</h4>
          <p className="text-xl font-bold text-slate-200 mt-1">{appliedCount}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-purple-500/20 bg-purple-950/5">
          <h4 className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold">Interviewing</h4>
          <p className="text-xl font-bold text-purple-400 mt-1">{interviewingCount}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/5">
          <h4 className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">Offers</h4>
          <p className="text-xl font-bold text-emerald-400 mt-1">{offeredCount}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-rose-900/30 bg-rose-950/5">
          <h4 className="text-[10px] text-rose-500 uppercase tracking-widest font-semibold">Rejected</h4>
          <p className="text-xl font-bold text-rose-400 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Application History Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">Application Pipeline</h3>
        <div className="border border-slate-900 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-950/80 border-b border-slate-850 p-3 grid grid-cols-1 md:grid-cols-5 font-semibold text-slate-450">
            <span className="md:col-span-2">Position / Company</span>
            <span>Current Stage</span>
            <span>Pipeline Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-slate-900">
            {applications.map((app) => (
              <div key={app.id} className="p-3 grid grid-cols-1 md:grid-cols-5 items-center hover:bg-slate-900/10 gap-3 md:gap-0">
                <div className="md:col-span-2">
                  <p className="font-semibold text-slate-200">{app.title}</p>
                  <p className="text-[10px] text-slate-500">{app.company}</p>
                </div>
                <div>
                  <span className="text-slate-300 font-mono">
                    {app.status === "interviewing" ? "Interview Stage" : app.status === "offered" ? "Offer Received" : app.status === "rejected" ? "Ended" : "Initial Application"}
                  </span>
                </div>
                <div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono border ${
                      app.status === "interviewing"
                        ? "bg-purple-950 text-purple-400 border-purple-900"
                        : app.status === "offered"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                        : app.status === "rejected"
                        ? "bg-rose-950 text-rose-400 border-rose-900"
                        : "bg-slate-900 text-slate-450 border-slate-800"
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      loadAppInterviews(app.id);
                      setShowScheduleModal(app.id);
                    }}
                    className="px-2 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-purple-400 border border-purple-900/30 rounded transition-all outline-none"
                  >
                    🗓 Prep/Schedule
                  </button>
                  <button
                    onClick={() => setShowOutcomeModal(app.id)}
                    className="px-2 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-900/30 rounded transition-all outline-none"
                  >
                    ⚖ Outcome
                  </button>
                  <button
                    onClick={() => {
                      loadAppInterviews(app.id);
                      setShowDetailModal(app);
                    }}
                    className="px-2 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-all outline-none"
                  >
                    👁 View
                  </button>
                  <button
                    onClick={() => deleteApplication(app.id)}
                    className="px-2 py-1 text-[10px] bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-900/30 rounded transition-all outline-none"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}

            {applications.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-8">No applications currently tracked. Log one above!</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add Application */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-850 w-full max-w-md space-y-4 relative">
            <h3 className="text-md font-bold text-white">Log Job Application</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Target Role (Job Description)</label>
                <select
                  value={selectedJD}
                  onChange={(e) => setSelectedJD(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-purple-500/50"
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

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Tailored Resume Version</label>
                <select
                  value={selectedResume}
                  onChange={(e) => setSelectedResume(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-purple-500/50"
                  required
                >
                  <option value="">-- Select generated version --</option>
                  {resumeVersionsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      v{r.version_number} - {r.jd_title ? `${r.jd_title} (${r.jd_company})` : "General"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Notes / Details</label>
                <textarea
                  value={appNotes}
                  onChange={(e) => setAppNotes(e.target.value)}
                  rows={3}
                  placeholder="E.g. Referral contact, salary range, agency names..."
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-800 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Interview */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-850 w-full max-w-md space-y-4 relative">
            <h3 className="text-md font-bold text-white font-sans">Schedule Interview Round</h3>
            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Round Number</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={interviewRound}
                  onChange={(e) => setInterviewRound(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Date & Time</label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Interviewer Details / Platform</label>
                <input
                  type="text"
                  placeholder="E.g. Technical panel with team lead, Google Meet link..."
                  value={interviewerInfo}
                  onChange={(e) => setInterviewerInfo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(null)}
                  className="px-4 py-2 border border-slate-800 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg"
                >
                  Schedule Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Outcome */}
      {showOutcomeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-850 w-full max-w-md space-y-4 relative">
            <h3 className="text-md font-bold text-white">Log Process Outcome</h3>
            <form onSubmit={handleOutcomeSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Outcome Decision</label>
                <select
                  value={outcomeType}
                  onChange={(e) => setOutcomeType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-purple-500/50"
                  required
                >
                  <option value="offer">🎉 Offer Received</option>
                  <option value="rejection">🥀 Rejection / Ended</option>
                  <option value="withdraw">🏳 Withdraw Application</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Feedback / Notes</label>
                <textarea
                  value={outcomeFeedback}
                  onChange={(e) => setOutcomeFeedback(e.target.value)}
                  rows={3}
                  placeholder="Record package details, behavioral feedback, or preparation lessons learned..."
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(null)}
                  className="px-4 py-2 border border-slate-800 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg"
                >
                  Save Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-850 w-full max-w-lg space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-md font-bold text-white">{showDetailModal.title}</h3>
              <p className="text-xs text-slate-500">{showDetailModal.company} • Status: {showDetailModal.status}</p>
            </div>

            {showDetailModal.notes && (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-400">Application Notes</h4>
                <p className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-300">
                  {showDetailModal.notes}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-slate-400">Scheduled Interview Rounds</h4>
              <div className="space-y-2">
                {interviews[showDetailModal.id]?.map((i) => (
                  <div key={i.id} className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-200">Round {i.round_number} ({i.status})</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{i.interviewer_info || "No details provided"}</p>
                    </div>
                    <span className="font-mono text-slate-400">{new Date(i.scheduled_at).toLocaleString()}</span>
                  </div>
                ))}

                {(!interviews[showDetailModal.id] || interviews[showDetailModal.id].length === 0) && (
                  <p className="text-xs text-slate-500 italic">No interview rounds currently scheduled.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-900 pt-4">
              <button
                type="button"
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs border border-slate-800"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
