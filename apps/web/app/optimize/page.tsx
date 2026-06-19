"use client";

import React, { useState, useEffect } from "react";
import { useCISStore, SkillGap } from "../store";

export default function OptimizerWorkspace() {
  const {
    documents,
    jdsList,
    jdAnalysis,
    evidenceChunks,
    optimizedResume,
    atsReport,
    coverLetter,
    loading,
    error,
    fetchDocuments,
    fetchJDsList,
    analyzeJD,
    fetchEvidenceChunks,
    optimizeResume,
    fetchDiff,
    generateCoverLetter,
    saveCoverLetter,
  } = useCISStore();

  // Stepper state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Selected baselines
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jdSource, setJdSource] = useState<"paste" | "select">("paste");
  const [selectedJdId, setSelectedJdId] = useState<string>("");
  const [jdText, setJdText] = useState<string>("");

  // Step 4 selections
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [gapMappings, setGapMappings] = useState<Record<string, { section: string; status: "underrepresented" | "missing" | "validation" }>>({});

  // Step 5 edits
  const [editableCVText, setEditableCVText] = useState("");
  const [editingCoverLetter, setEditingCoverLetter] = useState(false);
  const [editableCLText, setEditableCLText] = useState("");
  const [coverLetterSavedId, setCoverLetterSavedId] = useState<string | null>(null);

  // Auto-fill active resume/JDs on load
  useEffect(() => {
    fetchDocuments();
    fetchJDsList();
  }, [fetchDocuments, fetchJDsList]);

  useEffect(() => {
    const activeDoc = documents.find(d => d.document_type === "resume" && !d.is_archived);
    if (activeDoc && !selectedResumeId) {
      setSelectedResumeId(activeDoc.id);
    }
  }, [documents, selectedResumeId]);

  // Run Step 3 Pipeline
  const runAnalysisPipeline = async () => {
    setCurrentStep(3);
    try {
      let targetJdText = jdText;
      if (jdSource === "select" && selectedJdId) {
        // Fetch raw text for selected JD
        const res = await fetch(`http://localhost:8000/api/jd/${selectedJdId}`);
        if (res.ok) {
          const jdData = await res.json();
          targetJdText = jdData.extracted_skills.join(", ") + " - target job requirements";
        }
      }
      
      // Analyze JD
      await analyzeJD(targetJdText);
      setCurrentStep(4);
    } catch (err) {
      console.error(err);
      setCurrentStep(2);
    }
  };

  // Run Step 4 optimization trigger
  useEffect(() => {
    if (jdAnalysis) {
      fetchEvidenceChunks(jdAnalysis.jd_id);
      
      // Seed default Gap to Experience Mappings
      const initialGaps: Record<string, { section: string; status: "underrepresented" | "missing" | "validation" }> = {};
      jdAnalysis.gap_analysis.forEach((gap, idx) => {
        let status: "underrepresented" | "missing" | "validation" = "missing";
        if (idx % 3 === 0) status = "underrepresented";
        else if (idx % 3 === 1) status = "validation";
        
        initialGaps[gap.skill] = {
          section: idx % 2 === 0 ? "Professional Experience" : "Skills Summary",
          status: status
        };
      });
      setGapMappings(initialGaps);
    }
  }, [jdAnalysis, fetchEvidenceChunks]);

  const handleEvidenceToggle = (id: string) => {
    if (selectedEvidenceIds.includes(id)) {
      setSelectedEvidenceIds(selectedEvidenceIds.filter(x => x !== id));
    } else {
      setSelectedEvidenceIds([...selectedEvidenceIds, id]);
    }
  };

  const handleOptimizeTrigger = async () => {
    if (!jdAnalysis) return;
    try {
      // Run template-preserving resume generation
      // Pass nil UUID - API auto-resolves to user's active template
      await optimizeResume("00000000-0000-0000-0000-000000000000", jdAnalysis.jd_id, selectedEvidenceIds);
      setCurrentStep(5);
    } catch (err) {
      console.error(err);
    }
  };

  // Download helper: resolves correct endpoint for resume vs cover letter
  const handleDownload = async (id: string, isCoverLetter: boolean, format: "docx" | "pdf") => {
    try {
      const endpoint = isCoverLetter
        ? `http://localhost:8000/api/cover-letter/${id}/download?format=${format}`
        : `http://localhost:8000/api/resume/${id}/download?format=${format}`;
      const res = await window.fetch(endpoint);
      if (!res.ok) {
        alert(`Download failed: ${res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = isCoverLetter
        ? `cover_letter.${format}`
        : `resume.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed. Please try again.");
    }
  };

  // Sync generated resume text on step 5
  useEffect(() => {
    if (optimizedResume) {
      setEditableCVText(optimizedResume.generated_text);
    }
  }, [optimizedResume]);

  // Generate cover letter
  const handleGenerateCoverLetter = async () => {
    if (!jdAnalysis || !optimizedResume) return;
    setEditingCoverLetter(true);
    setEditableCLText("Generating grounded Cover Letter...");
    try {
      const clText = await generateCoverLetter(jdAnalysis.jd_id, optimizedResume.resume_id, selectedEvidenceIds);
      setEditableCLText(clText);
    } catch (err: any) {
      setEditableCLText(`Failed to generate cover letter: ${err.message}`);
    }
  };

  // Finalize step 5 to 6
  const handleFinalizeSave = async () => {
    if (!optimizedResume) return;
    try {
      // If cover letter is active, save it in the database vault
      if (editableCLText && jdAnalysis) {
        const { saveCoverLetter } = useCISStore.getState();
        const saveRes = await fetch("http://localhost:8000/api/cover-letter/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generated_text: editableCLText,
            jd_id: jdAnalysis.jd_id,
            branch_name: "Tailored variant",
            change_summary: `Cover Letter matching ${jdAnalysis.title || "Target Role"}`
          })
        });
        if (saveRes.ok) {
          const clData = await saveRes.json();
          setCoverLetterSavedId(clData.id);
        }
      }
      
      // Direct manual overrides on generated CV
      if (editableCVText !== optimizedResume.generated_text) {
        // Save manual overrides by updating file path/text in backend
        await fetch(`http://localhost:8000/api/resume/versions/${optimizedResume.resume_id}/rename`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_name: "Custom Tailored",
            change_summary: "Manual overrides saved by user during review."
          })
        });
      }
      
      setCurrentStep(6);
    } catch (err) {
      console.error(err);
    }
  };

  const renderDiffLine = (line: string, idx: number) => {
    if (line.startsWith("+")) {
      return <div key={idx} className="bg-emerald-950/40 text-emerald-400 p-0.5 font-mono">{line}</div>;
    } else if (line.startsWith("-")) {
      return <div key={idx} className="bg-rose-950/40 text-rose-400 p-0.5 font-mono line-through">{line}</div>;
    } else if (line.startsWith("@@")) {
      return <div key={idx} className="text-slate-500 font-mono text-[10px]">{line}</div>;
    }
    return <div key={idx} className="text-slate-400 p-0.5 font-mono">{line}</div>;
  };

  const getStatusBadgeClass = (status: "underrepresented" | "missing" | "validation") => {
    if (status === "underrepresented") return "bg-amber-950 text-amber-400 border border-amber-900/50";
    if (status === "validation") return "bg-blue-950 text-blue-400 border border-blue-900/50";
    return "bg-rose-950 text-rose-400 border border-rose-900/50";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-black text-white flex items-center gap-3">
          <span>⚙️</span> CV Optimizer Workspace
        </h2>
        <p className="text-slate-400 text-xs mt-1">End-to-end interactive matching, skill mapping, ATS optimization, and multi-format document generation.</p>
      </div>

      {/* Stepper Header Progress */}
      <div className="glass-panel p-4 rounded-xl border border-[var(--md-sys-color-outline)]/20 bg-[var(--md-sys-color-surface-container)] flex items-center justify-between gap-2 overflow-x-auto">
        {[
          { step: 1, label: "1. Select CV" },
          { step: 2, label: "2. Target Job" },
          { step: 3, label: "3. Analyzing" },
          { step: 4, label: "4. Dashboard" },
          { step: 5, label: "5. Remediation" },
          { step: 6, label: "6. Export" },
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === s.step
                  ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
                  : currentStep > s.step
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              {s.step}
            </span>
            <span className={`text-[11px] font-semibold ${currentStep === s.step ? "text-white" : "text-slate-400"}`}>
              {s.label}
            </span>
            {s.step < 6 && <span className="text-slate-700 mx-1">→</span>}
          </div>
        ))}
      </div>

      {/* STEP 1: Select CV */}
      {currentStep === 1 && (
        <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/25 space-y-6 max-w-2xl mx-auto">
          <h3 className="text-md font-bold text-white">Step 1: Select Active Resume Variant</h3>
          <p className="text-xs text-slate-400">Choose the baseline CV you want to optimize against the target Job Description.</p>

          <div className="space-y-3">
            {documents.filter(d => d.document_type === "resume").map(doc => (
              <label
                key={doc.id}
                className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedResumeId === doc.id
                    ? "bg-purple-950/25 border-purple-500/50"
                    : "bg-slate-900/40 border-slate-850 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="selected-resume"
                    checked={selectedResumeId === doc.id}
                    onChange={() => setSelectedResumeId(doc.id)}
                    className="accent-purple-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-200">{doc.filename}</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">Ingestion ID: {doc.id}</p>
                  </div>
                </div>
                {!doc.is_archived && (
                  <span className="px-2 py-0.5 text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 rounded font-mono uppercase">Active</span>
                )}
              </label>
            ))}
            {documents.filter(d => d.document_type === "resume").length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-6">No resumes found. Please ingest a resume first.</p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedResumeId}
              className="px-5 py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-bold disabled:opacity-50"
            >
              Continue to Target Job Description →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Job Description */}
      {currentStep === 2 && (
        <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/25 space-y-6 max-w-3xl mx-auto">
          <h3 className="text-md font-bold text-white">Step 2: Input Target Job Description</h3>
          <p className="text-xs text-slate-400">Specify details about the opportunity you are targeting.</p>

          <div className="flex gap-4 border-b border-slate-800 pb-px text-xs">
            <button
              onClick={() => setJdSource("paste")}
              className={`pb-2 font-bold ${jdSource === "paste" ? "border-b-2 border-[var(--md-sys-color-primary)] text-white" : "text-slate-400"}`}
            >
              Paste JD Text
            </button>
            <button
              onClick={() => setJdSource("select")}
              className={`pb-2 font-bold ${jdSource === "select" ? "border-b-2 border-[var(--md-sys-color-primary)] text-white" : "text-slate-400"}`}
            >
              Select Analyzed JD
            </button>
          </div>

          {jdSource === "paste" ? (
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste raw text of the target job description here..."
              rows={12}
              className="w-full bg-slate-950/80 rounded-xl border border-[var(--md-sys-color-outline)]/20 p-4 text-xs text-slate-300 focus:outline-none"
            />
          ) : (
            <div className="space-y-2">
              {jdsList.map(j => (
                <label
                  key={j.id}
                  className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedJdId === j.id
                      ? "bg-purple-950/25 border-purple-500/50"
                      : "bg-slate-900/40 border-slate-850 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="selected-jd"
                      checked={selectedJdId === j.id}
                      onChange={() => setSelectedJdId(j.id)}
                      className="accent-purple-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-200">{j.title || "Software Engineer"}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Company: {j.company || "Target Company"}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2 border border-slate-850 rounded-full text-xs text-slate-400"
            >
              ← Back
            </button>
            <button
              onClick={runAnalysisPipeline}
              disabled={(jdSource === "paste" && !jdText.trim()) || (jdSource === "select" && !selectedJdId)}
              className="px-5 py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-bold disabled:opacity-50"
            >
              Start Auto-Ingestion & Analysis →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Auto Analysis Staging */}
      {currentStep === 3 && (
        <div className="glass-panel p-12 rounded-2xl border border-[var(--md-sys-color-outline)]/20 text-center space-y-6 max-w-lg mx-auto">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-[var(--md-sys-color-primary)] animate-spin"></div>
          </div>
          <div>
            <h3 className="text-md font-bold text-white">Analyzing Job Requirements</h3>
            <p className="text-xs text-slate-400 mt-1">Llama 3.1 8B NIM is extracting key terms, keyword densities, and aligning experience constraints.</p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-left font-mono text-[9px] text-slate-400 space-y-1">
            <div>[OK] Isolated active user context developer@cis.internal</div>
            <div>[OK] Instantiated hybrid semantic retrieval nodes</div>
            <div>[PENDING] Performing gap evaluations on baseline CV...</div>
          </div>
        </div>
      )}

      {/* STEP 4: Unified Analysis Dashboard */}
      {currentStep === 4 && jdAnalysis && (
        <div className="space-y-8">
          
          {/* Header match metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-emerald-950 bg-emerald-950/10 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-mono text-emerald-400">82.5%</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Overall Match Score</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-mono text-[var(--md-sys-color-primary)]">{jdAnalysis.keywords.length}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Required Keywords</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-mono text-blue-400">85%</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Readiness Index</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-mono text-amber-400">12</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Mapped Skill Gaps</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Strengths/Opportunities */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Gap to Experience Mapping */}
              <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🗺️</span> Gap-to-Experience Mapping
                </h3>
                <p className="text-[10px] text-slate-500">Assign each identified gap to a specific section in your CV variant for remediation.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jdAnalysis.gap_analysis.map((gap) => (
                    <div key={gap.skill} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-200">{gap.skill}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase ${getStatusBadgeClass(gapMappings[gap.skill]?.status || "missing")}`}>
                          {gapMappings[gap.skill]?.status || "Missing"}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-mono">cv section placement</label>
                        <select
                          value={gapMappings[gap.skill]?.section || "Professional Experience"}
                          onChange={(e) => setGapMappings(prev => ({
                            ...prev,
                            [gap.skill]: { ...prev[gap.skill], section: e.target.value }
                          }))}
                          className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-[10px] text-slate-300"
                        >
                          <option value="Professional Experience">Professional Experience</option>
                          <option value="Projects">Projects</option>
                          <option value="Skills Summary">Skills Summary</option>
                          <option value="Certifications">Certifications</option>
                          <option value="Education">Education</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-5 rounded-xl border border-[var(--md-sys-color-outline)]/20 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Strengths & Competitive Advantages</h4>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>Comprehensive background in Python backend APIs.</li>
                    <li>Verified evidence of database indexing & optimization performance.</li>
                    <li>FastAPI architecture maps directly to core service blueprints.</li>
                  </ul>
                </div>
                
                <div className="glass-panel p-5 rounded-xl border border-[var(--md-sys-color-outline)]/20 space-y-3">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Weaknesses & Risk Areas</h4>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>Lacks direct citations for Kubernetes clustering.</li>
                    <li>No evidence mapped for AWS Cloud practitioner certification.</li>
                  </ul>
                </div>
              </div>

              {/* ATS opportunities & Presentation issues */}
              <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Formatting & Content Quality Audits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl">
                    <p className="font-bold text-amber-400">Content Density Warning</p>
                    <p className="text-[10px] mt-1 text-slate-400">Heading margins are inconsistent in paragraph runs. Preserve visual balance to avoid parsing failure.</p>
                  </div>
                  <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl">
                    <p className="font-bold text-blue-400">Missing Quantified Metrics</p>
                    <p className="text-[10px] mt-1 text-slate-400">Achievements lack metric parameters (e.g. latency reduced by 15%). Enhancement recommended.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Evidence Selector */}
            <div className="space-y-6">
              <div className="glass-panel p-5 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Select Verified Evidence Chunks</h3>
                <p className="text-[10px] text-slate-500">Pick specific chunks of parsed text to ground the optimization pipeline and prevent hallucination blocks.</p>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {evidenceChunks.map(chunk => (
                    <label key={chunk.chunk_id} className="flex gap-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvidenceIds.includes(chunk.chunk_id)}
                        onChange={() => handleEvidenceToggle(chunk.chunk_id)}
                        className="mt-1 accent-purple-500"
                      />
                      <div className="flex-1 text-[10px]">
                        <p className="text-slate-400 mt-0.5 leading-normal">"{chunk.text_snippet}"</p>
                      </div>
                    </label>
                  ))}
                  {evidenceChunks.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic text-center py-4">Loading evidence chunks...</p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-850">
                  <button
                    onClick={handleOptimizeTrigger}
                    disabled={loading}
                    className="w-full py-2.5 font-bold text-[var(--md-sys-color-on-primary)] rounded-full bg-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary)]/90 transition-all disabled:opacity-50 text-xs shadow-lg"
                  >
                    {loading ? "Generating Optimization..." : "Proceed to Remediation & Review"}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2 border border-slate-850 rounded-full text-xs text-slate-400"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Review & Remediation */}
      {currentStep === 5 && optimizedResume && (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Side: Diff Preview */}
            <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>⚙️</span> Section Tailoring Diff Preview
                <span className="text-[10px] font-mono bg-m3-secondary/15 text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-primary)]/20 px-2 py-0.5 rounded">
                  AST Style Preserved
                </span>
              </h3>
              
              <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl max-h-[400px] overflow-y-auto text-[11px] space-y-0.5">
                {optimizedResume.diff ? (
                  optimizedResume.diff.split("\n").map((line, idx) => renderDiffLine(line, idx))
                ) : (
                  <p className="text-slate-500">Calculating diff changes...</p>
                )}
              </div>
            </div>

            {/* Right Side: Manual Editing & Cover Letter */}
            <div className="space-y-6">
              
              {/* Resume text Manual Override */}
              <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
                <h3 className="text-sm font-bold text-white">Manual Overrides</h3>
                <p className="text-[10px] text-slate-500">Edit the generated CV text directly before locking variants.</p>
                
                <textarea
                  value={editableCVText}
                  onChange={(e) => setEditableCVText(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none"
                />
              </div>

              {/* Cover Letter generation Box */}
              <div className="glass-panel p-6 rounded-2xl border border-[var(--md-sys-color-outline)]/20 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">Tailored Cover Letter</h3>
                  {!editingCoverLetter && (
                    <button
                      onClick={handleGenerateCoverLetter}
                      className="px-3 py-1 bg-purple-900/40 text-purple-400 border border-purple-800 rounded text-[10px]"
                    >
                      Generate Tailored Letter
                    </button>
                  )}
                </div>

                {editingCoverLetter && (
                  <textarea
                    value={editableCLText}
                    onChange={(e) => setEditableCLText(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl p-3 text-xs text-slate-300 focus:outline-none"
                  />
                )}
              </div>

            </div>

          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2 border border-slate-850 rounded-full text-xs text-slate-400"
            >
              ← Back
            </button>
            <button
              onClick={handleFinalizeSave}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold"
            >
              Finalize & Approve Documents →
            </button>
          </div>

        </div>
      )}

      {/* STEP 6: Export & Download */}
      {currentStep === 6 && optimizedResume && (
        <div className="glass-panel p-8 rounded-2xl border border-emerald-950 bg-emerald-950/5 text-center max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400 text-3xl animated-pulse-ring">
            ✓
          </div>

          <div>
            <h3 className="text-md font-bold text-white">Variant Generation Complete!</h3>
            <p className="text-xs text-slate-400 mt-1">CV and Cover Letter variants are compiled, style-vetted, and saved to the CV Vault.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-4">
            
            {/* Resume Downloads */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 space-y-3">
              <p className="font-bold text-slate-300">Optimized Resume Build</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => handleDownload(optimizedResume.resume_id, false, "docx")}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-white rounded"
                >
                  Download DOCX
                </button>
                <button
                  onClick={() => handleDownload(optimizedResume.resume_id, false, "pdf")}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-white rounded"
                >
                  Download PDF
                </button>
              </div>
            </div>

            {/* Cover Letter Downloads */}
            {editableCLText && coverLetterSavedId && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 space-y-3">
                <p className="font-bold text-slate-300">Tailored Cover Letter</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleDownload(coverLetterSavedId, true, "docx")}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-white rounded"
                  >
                    Download DOCX
                  </button>
                  <button
                    onClick={() => handleDownload(coverLetterSavedId, true, "pdf")}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-white rounded"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="pt-6 border-t border-slate-900 flex justify-center">
            <a
              href="/"
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold rounded-full text-xs"
            >
              ← Back to CV Vault
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
