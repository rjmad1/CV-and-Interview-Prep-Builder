"use client";

import React, { useEffect, useState } from "react";
import { useCISStore, DocumentInfo } from "./store";
import { apiFetch, API_BASE } from "./api/apiFetch";

export default function CVVaultPage() {
  const {
    documents,
    resumeVersionsList,
    coverLettersList,
    loading,
    error,
    fetchDocuments,
    fetchResumeVersionsList,
    fetchCoverLettersList,
    uploadDocumentWithType,
    restoreResumeVersion,
    duplicateResumeVersion,
    branchResumeVersion,
    renameResumeVersion,
    archiveResumeVersion,
    deleteResumeVersion,
    renameCoverLetter,
    archiveCoverLetter,
    deleteCoverLetter,
    resetDatabase,
    compareResumeVersions,
  } = useCISStore();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"resumes" | "letters" | "supporting" | "settings">("resumes");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Active Selections
  const [viewingDoc, setViewingDoc] = useState<{ title: string; content: string } | null>(null);
  const [renamingVersion, setRenamingVersion] = useState<{ id: string; name: string; isLetter: boolean } | null>(null);
  const [branchingVersion, setBranchingVersion] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string; isLetter: boolean; isDoc: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [compareSelection, setCompareSelection] = useState<{ v1: string; v2: string } | null>(null);
  const [compareDiff, setCompareDiff] = useState<string | null>(null);

  // Uploading state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>("resume");

  // Config State
  const [storageType, setStorageType] = useState("local");
  const [uploadDir, setUploadDir] = useState("c:/Users/rajaj/Projects/CV and Interview Prep Builder/data/uploads");
  const [resumeDir, setResumeDir] = useState("c:/Users/rajaj/Projects/CV and Interview Prep Builder/data/resumes");
  const [clDir, setClDir] = useState("c:/Users/rajaj/Projects/CV and Interview Prep Builder/data/cover_letters");
  const [encryptionActive, setEncryptionActive] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [autoPurgeTemp, setAutoPurgeTemp] = useState(true);

  useEffect(() => {
    fetchDocuments();
    fetchResumeVersionsList();
    fetchCoverLettersList();
  }, [fetchDocuments, fetchResumeVersionsList, fetchCoverLettersList]);

  // Handle document scan upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    await uploadDocumentWithType(uploadFile, uploadType);
    setUploadFile(null);
    // Reset file input element
    const fileInput = document.getElementById("vault-file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // Trigger downloads from backend endpoint
  const handleDownload = (id: string, isLetter: boolean, format: "docx" | "pdf") => {
    const type = isLetter ? "cover-letter" : "resume";
    const downloadUrl = `http://localhost:8000/api/${type}/${id}/download?format=${format}`;
    window.open(downloadUrl, "_blank");
  };

  // Run unified diff comparison
  const handleCompareSubmit = async () => {
    if (!compareSelection?.v1 || !compareSelection?.v2) return;
    setCompareDiff("Calculating diff analysis...");
    const diff = await compareResumeVersions(compareSelection.v1, compareSelection.v2);
    setCompareDiff(diff);
  };

  // Cleanup/Reset trigger
  const handleResetTrigger = async () => {
    await resetDatabase();
    setConfirmReset(false);
  };

  // Filter list helper
  const filterBySearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Group Resumes and variants
  const activeResumeDoc = documents.find(d => d.document_type === "resume" && !d.is_archived);
  const originalResumes = documents.filter(d => d.document_type === "resume" && filterBySearch(d.filename));
  const activeVersions = resumeVersionsList.filter(rv => filterBySearch(rv.jd_title || "") || filterBySearch(rv.branch_name));
  const activeCoverLetters = coverLettersList.filter(cl => filterBySearch(cl.jd_title || "") || filterBySearch(cl.branch_name));
  const supportingDocuments = documents.filter(d => d.document_type !== "resume" && filterBySearch(d.filename));

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-950 bg-emerald-950/20";
    if (score >= 60) return "text-amber-400 border-amber-950 bg-amber-950/20";
    return "text-rose-400 border-rose-950 bg-rose-950/20";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header and Global Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--md-sys-color-outline)]/20 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span>📁</span> CV Vault <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-primary)]/20 uppercase tracking-wider">Central Repository</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Organize resumes, cover letter versions, portfolios, and manage system storage settings.</p>
        </div>

        {/* Global Filter Search bar */}
        <div className="relative w-full md:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            id="global-search-bar"
            aria-label="Search by role, company, or skill"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by role, company, skill..."
            className="w-full bg-[var(--md-sys-color-surface-container)] rounded-full border border-[var(--md-sys-color-outline)]/25 pl-10 pr-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)]/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-2 border-b border-[var(--md-sys-color-outline)]/20 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("resumes")}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "resumes"
              ? "border-[var(--md-sys-color-primary)] text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>📄</span> Resume Library ({resumeVersionsList.length})
        </button>
        <button
          onClick={() => setActiveTab("letters")}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "letters"
              ? "border-[var(--md-sys-color-primary)] text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>✉️</span> Cover Letters ({coverLettersList.length})
        </button>
        <button
          onClick={() => setActiveTab("supporting")}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "supporting"
              ? "border-[var(--md-sys-color-primary)] text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>💼</span> Supporting Assets ({supportingDocuments.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "settings"
              ? "border-[var(--md-sys-color-primary)] text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>🛠️</span> Vault Settings
        </button>
      </div>

      {/* Main Container Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Document Ingestion Form (Side panel for quick uploads) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Ingest Career Assets</h3>
            
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="asset-category-select" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Asset Category</label>
                <select
                  id="asset-category-select"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full bg-slate-950/80 rounded-xl border border-[var(--md-sys-color-outline)]/30 p-2.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="resume">Resume/CV</option>
                  <option value="certification">Certification</option>
                  <option value="portfolio">Project Portfolio</option>
                  <option value="recommendation_letter">Recommendation Letter</option>
                  <option value="profile">Professional Profile</option>
                  <option value="other">Other Supporting Doc</option>
                </select>
              </div>

              <div className="border-2 border-dashed border-[var(--md-sys-color-outline)]/20 rounded-xl p-4 text-center hover:border-[var(--md-sys-color-primary)]/50 transition-all relative">
                <input
                  type="file"
                  id="vault-file-upload"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-1">
                  <span className="text-2xl">📤</span>
                  <p className="text-[11px] text-slate-300 font-semibold truncate">
                    {uploadFile ? uploadFile.name : "Select Document"}
                  </p>
                  <p className="text-[9px] text-slate-500">PDF, DOCX, TXT up to 10MB</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={!uploadFile || loading}
                className="w-full py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 glow-button"
              >
                {loading ? "Ingesting..." : "Ingest & Parse"}
              </button>
            </form>
          </div>

          {/* Quick Stats Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-[var(--md-sys-color-outline)]/20 text-xs space-y-3">
            <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[10px]">Vault Auditing</h4>
            <div className="space-y-2 font-mono text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span>Active CV:</span>
                <span className="text-[var(--md-sys-color-primary)] font-semibold truncate max-w-32">{activeResumeDoc ? activeResumeDoc.filename : "None Ingested"}</span>
              </div>
              <div className="flex justify-between">
                <span>Security Engine:</span>
                <span className="text-emerald-400">Tenant RLS Active</span>
              </div>
              <div className="flex justify-between">
                <span>Encryption rest:</span>
                <span className={encryptionActive ? "text-emerald-400" : "text-amber-400"}>{encryptionActive ? "AES-256 Enabled" : "Disabled"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab contents (Takes 3 columns on desktop) */}
        <div className="lg:col-span-3 space-y-6">

          {/* resumes TAB */}
          {activeTab === "resumes" && (
            <div className="space-y-6">
              {/* Compare Version Trigger Panel */}
              {resumeVersionsList.length >= 2 && (
                <div className="glass-panel p-4 rounded-xl border border-[var(--md-sys-color-outline)]/25 bg-[var(--md-sys-color-primary-container)]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-xs">
                    <p className="font-bold text-white">Compare Resume Variants</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Select two versions to run unified diff analysis.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      onChange={(e) => setCompareSelection(prev => ({ ...prev, v1: e.target.value } as any))}
                      className="bg-slate-950 border border-[var(--md-sys-color-outline)]/20 rounded px-2 py-1 text-[11px] text-slate-300"
                    >
                      <option value="">Select version 1</option>
                      {resumeVersionsList.map(rv => (
                        <option key={rv.id} value={rv.id}>v{rv.version_number} - {rv.branch_name} ({rv.jd_title || "Base"})</option>
                      ))}
                    </select>
                    <select
                      onChange={(e) => setCompareSelection(prev => ({ ...prev, v2: e.target.value } as any))}
                      className="bg-slate-950 border border-[var(--md-sys-color-outline)]/20 rounded px-2 py-1 text-[11px] text-slate-300"
                    >
                      <option value="">Select version 2</option>
                      {resumeVersionsList.map(rv => (
                        <option key={rv.id} value={rv.id}>v{rv.version_number} - {rv.branch_name} ({rv.jd_title || "Base"})</option>
                      ))}
                    </select>
                    <button
                      onClick={handleCompareSubmit}
                      disabled={!compareSelection?.v1 || !compareSelection?.v2}
                      className="px-3 py-1 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded font-semibold text-[11px] hover:opacity-90 disabled:opacity-50"
                    >
                      Compare
                    </button>
                  </div>
                </div>
              )}

              {/* Compare Diff View Box */}
              {compareDiff && (
                <div className="glass-panel p-5 rounded-2xl border border-[var(--md-sys-color-outline)]/25 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--md-sys-color-outline)]/20">
                    <h4 className="text-xs font-bold text-white">Variant Comparison Diff Output</h4>
                    <button onClick={() => setCompareDiff(null)} className="text-slate-400 hover:text-white text-xs">Clear Diff</button>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 overflow-x-auto max-h-80 text-[10px] font-mono leading-relaxed space-y-0.5">
                    {compareDiff.split("\n").map((line, idx) => {
                      if (line.startsWith("+")) return <div key={idx} className="bg-emerald-950/40 text-emerald-400">{line}</div>;
                      if (line.startsWith("-")) return <div key={idx} className="bg-rose-950/40 text-rose-400 line-through">{line}</div>;
                      if (line.startsWith("@@")) return <div key={idx} className="text-slate-500">{line}</div>;
                      return <div key={idx} className="text-slate-400">{line}</div>;
                    })}
                  </div>
                </div>
              )}

              {/* Original resume list */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📄</span> Ingested Original CVs
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--md-sys-color-outline)]/20 text-slate-400">
                        <th className="py-2.5 font-semibold">Filename</th>
                        <th className="py-2.5 font-semibold">Status</th>
                        <th className="py-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {originalResumes.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-900/10">
                          <td className="py-3 font-semibold text-slate-200">
                            {doc.filename}
                            {doc.is_archived && <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-slate-800 text-slate-500 font-mono">Archived</span>}
                            {!doc.is_archived && <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 font-mono">Active Analysis</span>}
                          </td>
                          <td className="py-3 text-[10px] text-slate-400 font-mono">Parsed Ingestion</td>
                          <td className="py-3 text-right space-x-2">
                            <button
                              onClick={() => setViewingDoc({ title: doc.filename, content: doc.parsed_text || "Processing..." })}
                              className="px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-400 hover:text-white"
                            >
                              View Content
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: doc.id, title: doc.filename, isLetter: false, isDoc: true })}
                              className="px-2.5 py-1 rounded border border-rose-950 text-[10px] text-rose-400 hover:bg-rose-950/20"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {originalResumes.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-6 text-slate-500 italic">No original resumes found in the vault.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Version Variants List */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚙️</span> Optimized Versions & Role-Specific Branches
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--md-sys-color-outline)]/20 text-slate-400">
                        <th className="py-2.5 font-semibold">Version Variant</th>
                        <th className="py-2.5 font-semibold">Target Opportunity</th>
                        <th className="py-2.5 font-semibold">Branch</th>
                        <th className="py-2.5 font-semibold">Change Summary</th>
                        <th className="py-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {activeVersions.map(rv => (
                        <tr key={rv.id} className="hover:bg-slate-900/10">
                          <td className="py-3 font-semibold text-slate-200">
                            Version #{rv.version_number}
                            {rv.is_archived && <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-slate-800 text-slate-500 font-mono">Archived</span>}
                            {!rv.is_archived && <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 font-mono">Active CV</span>}
                          </td>
                          <td className="py-3">
                            {rv.jd_title ? (
                              <div>
                                <p className="font-semibold text-slate-300">{rv.jd_title}</p>
                                <p className="text-[9px] text-slate-500">{rv.jd_company}</p>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Base Version</span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-[10px] text-slate-400">{rv.branch_name}</td>
                          <td className="py-3 text-[10px] text-slate-400 truncate max-w-48" title={rv.change_summary || ""}>
                            {rv.change_summary || <span className="italic">No change log</span>}
                          </td>
                          <td className="py-3 text-right space-x-1 flex flex-wrap gap-1.5 justify-end">
                            <button
                              onClick={() => setViewingDoc({ title: `Resume v${rv.version_number} - Branch: ${rv.branch_name}`, content: rv.change_summary || "Use DOCX or PDF download to view the full resume content." })}
                              className="px-2 py-0.5 rounded border border-slate-800 text-[9px] text-slate-400 hover:text-white"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDownload(rv.id, false, "docx")}
                              className="px-2 py-0.5 rounded border border-slate-800 text-[9px] text-slate-300 hover:text-white bg-slate-900/40"
                            >
                              DOCX
                            </button>
                            <button
                              onClick={() => handleDownload(rv.id, false, "pdf")}
                              className="px-2 py-0.5 rounded border border-slate-800 text-[9px] text-slate-300 hover:text-white bg-slate-900/40"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => setRenamingVersion({ id: rv.id, name: rv.branch_name, isLetter: false })}
                              className="px-2 py-0.5 rounded border border-slate-800 text-[9px] text-slate-400 hover:text-white"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => duplicateResumeVersion(rv.id)}
                              className="px-2 py-0.5 rounded border border-slate-800 text-[9px] text-slate-400 hover:text-white"
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => setBranchingVersion({ id: rv.id, name: "" })}
                              className="px-2 py-0.5 rounded border border-purple-900 text-[9px] text-purple-400 hover:bg-purple-950/20"
                            >
                              Branch
                            </button>
                            <button
                              onClick={() => restoreResumeVersion(rv.id)}
                              className="px-2 py-0.5 rounded border border-emerald-900 text-[9px] text-emerald-400 hover:bg-emerald-950/20"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => archiveResumeVersion(rv.id, !rv.is_archived)}
                              className="px-2 py-0.5 rounded border border-amber-900 text-[9px] text-amber-400 hover:bg-amber-950/20"
                            >
                              {rv.is_archived ? "Unarchive" : "Archive"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: rv.id, title: `v${rv.version_number} (${rv.branch_name})`, isLetter: false, isDoc: false })}
                              className="px-2 py-0.5 rounded border border-rose-950 text-[9px] text-rose-400 hover:bg-rose-950/20"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeVersions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-500 italic">No optimized versions exist yet. Run the CV Optimizer to generate one.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* cover letters TAB */}
          {activeTab === "letters" && (
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>✉️</span> Cover Letter Version History
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--md-sys-color-outline)]/20 text-slate-400">
                      <th className="py-2.5 font-semibold">Version</th>
                      <th className="py-2.5 font-semibold">Target Opportunity</th>
                      <th className="py-2.5 font-semibold">Branch/Variant</th>
                      <th className="py-2.5 font-semibold">Change Summary</th>
                      <th className="py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {activeCoverLetters.map(cl => (
                      <tr key={cl.id} className="hover:bg-slate-900/10">
                        <td className="py-3 font-semibold text-slate-200">
                          Version #{cl.version_number}
                          {cl.is_archived && <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-slate-800 text-slate-500 font-mono">Archived</span>}
                        </td>
                        <td className="py-3">
                          {cl.jd_title ? (
                            <div>
                              <p className="font-semibold text-slate-300">{cl.jd_title}</p>
                              <p className="text-[9px] text-slate-500">{cl.jd_company}</p>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">General Letter</span>
                          )}
                        </td>
                        <td className="py-3 font-mono text-[10px] text-slate-400">{cl.branch_name}</td>
                        <td className="py-3 text-[10px] text-slate-400 truncate max-w-48" title={cl.change_summary || ""}>
                          {cl.change_summary || <span className="italic">No change log</span>}
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => setViewingDoc({ title: `Cover Letter v${cl.version_number} - Branch: ${cl.branch_name}`, content: cl.generated_text })}
                            className="px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-400 hover:text-white"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(cl.id, true, "docx")}
                            className="px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-300 hover:text-white bg-slate-900/40"
                          >
                            DOCX
                          </button>
                          <button
                            onClick={() => handleDownload(cl.id, true, "pdf")}
                            className="px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-300 hover:text-white bg-slate-900/40"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => setRenamingVersion({ id: cl.id, name: cl.branch_name, isLetter: true })}
                            className="px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-400 hover:text-white"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => archiveCoverLetter(cl.id, !cl.is_archived)}
                            className="px-2.5 py-1 rounded border border-amber-900 text-[10px] text-amber-400 hover:bg-amber-950/20"
                          >
                            {cl.is_archived ? "Unarchive" : "Archive"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: cl.id, title: `v${cl.version_number} (${cl.branch_name})`, isLetter: true, isDoc: false })}
                            className="px-2.5 py-1 rounded border border-rose-950 text-[10px] text-rose-400 hover:bg-rose-950/20"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {activeCoverLetters.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-500 italic">No saved cover letters found. Save a cover letter from the optimizer workspace.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* supporting documents TAB */}
          {activeTab === "supporting" && (
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>💼</span> Supporting Career Assets
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--md-sys-color-outline)]/20 text-slate-400">
                      <th className="py-2.5 font-semibold">Filename</th>
                      <th className="py-2.5 font-semibold">Asset Category</th>
                      <th className="py-2.5 font-semibold">Status</th>
                      <th className="py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {supportingDocuments.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-900/10">
                        <td className="py-3 font-semibold text-slate-200">{doc.filename}</td>
                        <td className="py-3 capitalize text-[10px] text-slate-400 font-mono">{doc.document_type.replace("_", " ")}</td>
                        <td className="py-3 text-[10px] text-emerald-400 font-mono">Parsed & Grounded</td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => setViewingDoc({ title: doc.filename, content: doc.parsed_text || "Processing..." })}
                            className="px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-400 hover:text-white"
                          >
                            View Content
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: doc.id, title: doc.filename, isLetter: false, isDoc: true })}
                            className="px-2.5 py-1 rounded border border-rose-950 text-[10px] text-rose-400 hover:bg-rose-950/20"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {supportingDocuments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-500 italic">No supporting documents uploaded. Select a type and upload on the left.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* settings TAB */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              
              {/* Storage Config */}
              <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚙️</span> Configurable Storage Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">Deployment Storage Architecture</label>
                    <select
                      value={storageType}
                      onChange={(e) => setStorageType(e.target.value)}
                      className="w-full bg-slate-950 border border-[var(--md-sys-color-outline)]/20 p-2 rounded text-slate-300"
                    >
                      <option value="local">Local File System (Default)</option>
                      <option value="network">Shared Network Folder (UNC Path)</option>
                      <option value="nas">Network Attached Storage (NAS)</option>
                      <option value="share">Enterprise File Share</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">File Ingestion Target Directory</label>
                    <input
                      type="text"
                      value={uploadDir}
                      onChange={(e) => setUploadDir(e.target.value)}
                      className="w-full bg-slate-950 border border-[var(--md-sys-color-outline)]/20 p-2 rounded text-slate-300 font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">Resume Builds Repository Path</label>
                    <input
                      type="text"
                      value={resumeDir}
                      onChange={(e) => setResumeDir(e.target.value)}
                      className="w-full bg-slate-950 border border-[var(--md-sys-color-outline)]/20 p-2 rounded text-slate-300 font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">Cover Letter Archive Directory</label>
                    <input
                      type="text"
                      value={clDir}
                      onChange={(e) => setClDir(e.target.value)}
                      className="w-full bg-slate-950 border border-[var(--md-sys-color-outline)]/20 p-2 rounded text-slate-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Retention Policy */}
              <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🧹</span> Automated Retention & Purge Policies
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="auto-purge-temp"
                      checked={autoPurgeTemp}
                      onChange={(e) => setAutoPurgeTemp(e.target.checked)}
                      className="mt-1 accent-[var(--md-sys-color-primary)]"
                    />
                    <label htmlFor="auto-purge-temp" className="cursor-pointer">
                      <span className="font-semibold text-slate-300 block">Delete Temporary Intermediate Artifacts</span>
                      <span className="text-[10px] text-slate-500">Automatically wipe parsing scripts and semantic staging folders once documents compile.</span>
                    </label>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300 block">Retention Window for Obsolete Variants</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                        className="bg-slate-950 border border-[var(--md-sys-color-outline)]/20 p-1.5 rounded text-slate-300 w-20 text-center font-mono"
                      />
                      <span className="text-slate-400">days before permanent purge</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Policy */}
              <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🛡️</span> Security Protocols & Cryptography Controls
                </h3>

                <div className="flex items-start gap-4 text-xs">
                  <div className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      id="encryption-toggle"
                      checked={encryptionActive}
                      onChange={(e) => setEncryptionActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--md-sys-color-primary)]"></div>
                  </div>
                  <label htmlFor="encryption-toggle" className="cursor-pointer flex-1">
                    <span className="font-semibold text-slate-300 block">Enforce AES-256 Storage Encryption at Rest</span>
                    <span className="text-[10px] text-slate-500">Encrypt documents written to local and shared paths using AES block chains. Requires decryption context for parsing.</span>
                  </label>
                </div>
              </div>

              {/* Cleanup State */}
              <div className="glass-panel p-6 rounded-2xl border border-rose-950/30 bg-rose-950/5 space-y-4">
                <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                  <span>⚠️</span> Irreversible Operations Area
                </h3>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-xs">
                    <p className="font-bold text-rose-300">Reset Application State & Purge Ingestions</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Completely clean the SQLite database, wipe files in uploads/resumes folders, and re-create initial developer states.</p>
                  </div>
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/10 shrink-0"
                  >
                    Reset & Purge Data
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* MODALS */}

      {/* Viewing parsed content modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/20 rounded-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-md font-bold text-white truncate pr-4">{viewingDoc.title}</h3>
              <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-white text-lg font-mono">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950/80 border border-slate-900 p-6 rounded-xl text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {viewingDoc.content}
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:text-white text-xs font-semibold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renaming Variant Modal */}
      {renamingVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/20 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Rename Variant / Branch Name</h3>
            <input
              type="text"
              value={renamingVersion.name}
              onChange={(e) => setRenamingVersion(prev => ({ ...prev, name: e.target.value } as any))}
              placeholder="Enter variant name (e.g. Software Engineer Role)"
              className="w-full bg-slate-950 border border-[var(--md-sys-color-outline)]/20 rounded p-2 text-xs text-slate-300 focus:outline-none"
            />
            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setRenamingVersion(null)}
                className="px-3 py-1.5 border border-slate-800 rounded text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (renamingVersion.isLetter) {
                    await renameCoverLetter(renamingVersion.id, renamingVersion.name);
                  } else {
                    await renameResumeVersion(renamingVersion.id, renamingVersion.name);
                  }
                  setRenamingVersion(null);
                }}
                className="px-3 py-1.5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-semibold rounded"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branching Resume Modal */}
      {branchingVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/20 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Branch Optimized CV Variant</h3>
            <p className="text-[10px] text-slate-400">Creates a copy of this version under a new custom branch name (e.g., "Fullstack React Variant").</p>
            <input
              type="text"
              value={branchingVersion.name}
              onChange={(e) => setBranchingVersion(prev => ({ ...prev, name: e.target.value } as any))}
              placeholder="Enter branch name (e.g. Solution Architect)"
              className="w-full bg-slate-950 border border-[var(--md-sys-color-outline)]/20 rounded p-2 text-xs text-slate-300 focus:outline-none"
            />
            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setBranchingVersion(null)}
                className="px-3 py-1.5 border border-slate-800 rounded text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!branchingVersion.name) return;
                  await branchResumeVersion(branchingVersion.id, branchingVersion.name);
                  setBranchingVersion(null);
                }}
                className="px-3 py-1.5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-semibold rounded"
              >
                Create Branch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleting Asset Modal (Confirmation with warning) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--md-sys-color-surface-container)] border border-rose-900/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <span>⚠️</span> Permanent Deletion Alert
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-bold text-white">{confirmDelete.title}</span>? This action is irreversible and will delete the database record and purge the matching file from the disk.
            </p>
            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 border border-slate-800 rounded text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmDelete.isDoc) {
                    // Delete doc in list
                    const { deleteApplication } = useCISStore.getState();
                    // Just call general delete document
                    const res = await apiFetch(`${API_BASE}/documents/${confirmDelete.id}`, { method: "DELETE" });
                    if (res.ok) await fetchDocuments();
                  } else if (confirmDelete.isLetter) {
                    await deleteCoverLetter(confirmDelete.id);
                  } else {
                    await deleteResumeVersion(confirmDelete.id);
                  }
                  setConfirmDelete(null);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Database Reset confirmation */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--md-sys-color-surface-container)] border border-rose-900/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <span>⚠️</span> Irreversible Vault Reset
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will drop and reconstruct the SQLite databases, erase all uploaded files, delete the Qdrant collections, and reset the platform to a clean baseline state.
              <br/><br/>
              To confirm, type <span className="font-mono text-rose-300 font-bold bg-slate-900 px-1 py-0.5 rounded">RESET</span> below:
            </p>
            <input
              type="text"
              id="reset-confirm-word"
              placeholder="Type RESET"
              className="w-full bg-slate-950 border border-rose-900/30 rounded p-2 text-xs text-slate-300 focus:outline-none"
            />
            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 border border-slate-800 rounded text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById("reset-confirm-word") as HTMLInputElement;
                  if (input && input.value.trim() === "RESET") {
                    handleResetTrigger();
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
              >
                Reset Baseline
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
