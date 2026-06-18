import { create } from "zustand";

export interface DocumentInfo {
  id: string;
  filename: string;
  document_type: string;
  parsed_text: string | null;
  metadata: any;
}

export interface SkillGap {
  skill: string;
  importance: string;
  status: string;
}

export interface JDAnalysis {
  jd_id: string;
  extracted_skills: string[];
  keywords: string[];
  gap_analysis: SkillGap[];
  title?: string;
  company?: string;
}

export interface EvidenceItem {
  chunk_id: string;
  confidence: number;
  text_snippet: string;
}

export interface ResumeVersion {
  resume_id: string;
  version: number;
  generated_text: string;
  evidence_bundle: EvidenceItem[];
  diff?: string;
}

export interface ATSReport {
  ats_score: number;
  keyword_coverage: number;
  semantic_match: number;
  readability_score: number;
  detailed_findings: {
    matching_keywords: string[];
    missing_keywords: string[];
    readability_issues: string[];
    score_rationale: string;
    recommendation?: string;
  };
}

export interface HallucinationEvent {
  id: string;
  session_id: string;
  generated_snippet: string;
  validation_status: string;
  audit_comments: string | null;
  created_at: string;
}

export interface VerifyClaimResponse {
  passed: boolean;
  similarity_score: number;
  matched_chunk_id: string | null;
  matched_chunk_text: string | null;
}

export interface Application {
  id: string;
  jd_id: string;
  resume_version_id: string;
  status: string;
  notes: string | null;
  company: string;
  title: string;
  created_at: string;
}

export interface InterviewRound {
  id: string;
  application_id: string;
  scheduled_at: string;
  round_number: number;
  interviewer_info: string | null;
  status: string;
}

export interface InterviewSession {
  session_id: string;
  active_question: string;
  question_number: number;
  coaching_tips?: string;
  completed: boolean;
  next_question?: string | null;
  report?: {
    readiness_score: number;
    key_strengths: string[];
    improvement_areas: string[];
    transcript: { speaker: string; text: string }[];
  };
}

interface CISState {
  documents: DocumentInfo[];
  jdAnalysis: JDAnalysis | null;
  optimizedResume: ResumeVersion | null;
  atsReport: ATSReport | null;
  interview: InterviewSession | null;
  evidenceChunks: EvidenceItem[];
  hallucinations: HallucinationEvent[];
  applications: Application[];
  interviews: Record<string, InterviewRound[]>;
  coverLetter: string | null;
  prepCards: any | null;
  jdsList: Array<{ id: string; company: string; title: string }>;
  resumeVersionsList: Array<{ id: string; version_number: number; jd_title: string | null; jd_company: string | null }>;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  analyzeJD: (jdText: string) => Promise<void>;
  optimizeResume: (templateId: string, jdId: string, evidenceIds: string[]) => Promise<void>;
  optimizeResumeATS: (resumeVersionId: string, jdId: string) => Promise<any>;
  fetchDiff: (resumeId: string) => Promise<void>;
  fetchATSReport: (resumeId: string) => Promise<void>;
  fetchEvidenceChunks: (jdId: string) => Promise<void>;
  fetchHallucinations: () => Promise<void>;
  overrideHallucination: (eventId: string, comments: string) => Promise<void>;
  verifyClaim: (text: string, evidenceIds: string[]) => Promise<VerifyClaimResponse>;
  fetchApplications: () => Promise<void>;
  createApplication: (jdId: string, resumeVersionId: string, notes?: string) => Promise<void>;
  updateApplicationStatus: (id: string, status: string, notes?: string) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  fetchInterviews: (applicationId: string) => Promise<void>;
  scheduleInterview: (applicationId: string, scheduledAt: string, roundNumber: number, interviewerInfo?: string) => Promise<void>;
  logOutcome: (applicationId: string, outcomeType: string, feedback?: string, details?: any) => Promise<void>;
  generateCoverLetter: (jdId: string, resumeVersionId: string, evidenceIds?: string[]) => Promise<string>;
  fetchPrepCards: (jdId: string, resumeVersionId: string) => Promise<void>;
  fetchJDsList: () => Promise<void>;
  fetchResumeVersionsList: () => Promise<void>;
  startInterview: (resumeId: string, jdId: string) => Promise<void>;
  submitInterviewResponse: (response: string) => Promise<void>;
  fetchInterviewReport: () => Promise<void>;
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

export const useCISStore = create<CISState>((set, get) => ({
  documents: [],
  jdAnalysis: null,
  optimizedResume: null,
  atsReport: null,
  interview: null,
  evidenceChunks: [],
  hallucinations: [],
  applications: [],
  interviews: {},
  coverLetter: null,
  prepCards: null,
  jdsList: [],
  resumeVersionsList: [],
  loading: false,
  error: null,

  fetchEvidenceChunks: async (jdId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/evidence/retrieve?jd_id=${jdId}`);
      if (!res.ok) throw new Error("Failed to retrieve candidate evidence chunks");
      const data = await res.json();
      set({ evidenceChunks: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      set({ documents: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  uploadDocument: async (file: File) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/documents/scan`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      
      // Refresh documents
      await get().fetchDocuments();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  analyzeJD: async (jdText: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/jd/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: jdText }),
      });
      if (!res.ok) throw new Error("JD analysis failed");
      const data = await res.json();
      set({ jdAnalysis: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  optimizeResume: async (templateId: string, jdId: string, evidenceIds: string[]) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/resume/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          jd_id: jdId,
          selected_evidence_ids: evidenceIds,
        }),
      });
      if (!res.ok) {
        const errorDetails = await res.json();
        throw new Error(errorDetails.detail || "Resume tailoring failed");
      }
      const data = await res.json();
      set({ optimizedResume: data, loading: false });
      
      // Auto-fetch diff
      await get().fetchDiff(data.resume_id);
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  optimizeResumeATS: async (resumeVersionId: string, jdId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/ats/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_version_id: resumeVersionId, jd_id: jdId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "ATS optimization failed");
      }
      const data = await res.json();
      set({ loading: false });
      
      set({
        optimizedResume: {
          resume_id: data.optimized_resume_id,
          version: data.version,
          generated_text: "",
          evidence_bundle: [],
        }
      });
      
      await get().fetchDiff(data.optimized_resume_id);
      await get().fetchATSReport(data.optimized_resume_id);
      
      return data;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchDiff: async (resumeId: string) => {
    try {
      const res = await fetch(`${API_URL}/resume/${resumeId}/diff`);
      if (!res.ok) throw new Error("Failed to load diff");
      const data = await res.json();
      set((state) => ({
        optimizedResume: state.optimizedResume
          ? { ...state.optimizedResume, diff: data.diff }
          : null,
      }));
    } catch (err: any) {
      console.error(err);
    }
  },

  fetchATSReport: async (resumeId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/ats/${resumeId}`);
      if (!res.ok) throw new Error("Failed to calculate ATS compatibility");
      const data = await res.json();
      set({ atsReport: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  startInterview: async (resumeId: string, jdId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id: resumeId, jd_id: jdId }),
      });
      if (!res.ok) throw new Error("Failed to start mock session");
      const data = await res.json();
      set({
        interview: {
          session_id: data.session_id,
          active_question: data.question,
          question_number: data.question_number,
          completed: false,
        },
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  submitInterviewResponse: async (response: string) => {
    const session = get().interview;
    if (!session) return;
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/interview/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          user_response: response,
        }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json();
      set({
        interview: {
          session_id: session.session_id,
          active_question: data.next_question || "Interview Completed",
          question_number: session.question_number + 1,
          coaching_tips: data.coaching_tips,
          completed: data.completed,
          next_question: data.next_question,
        },
        loading: false,
      });
      
      if (data.completed) {
        await get().fetchInterviewReport();
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchInterviewReport: async () => {
    const session = get().interview;
    if (!session) return;
    try {
      const res = await fetch(`${API_URL}/interview/report?session_id=${session.session_id}`);
      if (!res.ok) throw new Error("Report download failed");
      const data = await res.json();
      set((state) => ({
        interview: state.interview
          ? { ...state.interview, report: data }
          : null,
      }));
    } catch (err: any) {
      console.error(err);
    }
  },

  fetchHallucinations: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/evidence/hallucinations`);
      if (!res.ok) throw new Error("Failed to fetch hallucination events");
      const data = await res.json();
      set({ hallucinations: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  overrideHallucination: async (eventId: string, comments: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/evidence/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, audit_comments: comments }),
      });
      if (!res.ok) throw new Error("Failed to override hallucination block");
      await get().fetchHallucinations();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  verifyClaim: async (text: string, evidenceIds: string[]) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/evidence/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_snippet: text, selected_evidence_ids: evidenceIds }),
      });
      if (!res.ok) throw new Error("Verification request failed");
      const data = await res.json();
      set({ loading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchApplications: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/applications`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      set({ applications: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createApplication: async (jdId: string, resumeVersionId: string, notes?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_id: jdId, resume_version_id: resumeVersionId, notes }),
      });
      if (!res.ok) throw new Error("Failed to log application");
      await get().fetchApplications();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateApplicationStatus: async (id: string, status: string, notes?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update application");
      await get().fetchApplications();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteApplication: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete application");
      await get().fetchApplications();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchInterviews: async (applicationId: string) => {
    try {
      const res = await fetch(`${API_URL}/applications/${applicationId}/interviews`);
      if (!res.ok) throw new Error("Failed to fetch interviews");
      const data = await res.json();
      set((state) => ({
        interviews: { ...state.interviews, [applicationId]: data }
      }));
    } catch (err: any) {
      console.error(err);
    }
  },

  scheduleInterview: async (applicationId: string, scheduledAt: string, roundNumber: number, interviewerInfo?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/applications/${applicationId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: scheduledAt, round_number: roundNumber, interviewer_info: interviewerInfo }),
      });
      if (!res.ok) throw new Error("Failed to schedule interview");
      await get().fetchInterviews(applicationId);
      await get().fetchApplications();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logOutcome: async (applicationId: string, outcomeType: string, feedback?: string, details?: any) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/applications/${applicationId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome_type: outcomeType, feedback, details }),
      });
      if (!res.ok) throw new Error("Failed to log outcome");
      await get().fetchApplications();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  generateCoverLetter: async (jdId: string, resumeVersionId: string, evidenceIds?: string[]) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/cover-letter/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_id: jdId, resume_version_id: resumeVersionId, selected_evidence_ids: evidenceIds || [] }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Cover letter generation failed");
      }
      const data = await res.json();
      set({ coverLetter: data.cover_letter, loading: false });
      return data.cover_letter;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchPrepCards: async (jdId: string, resumeVersionId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/interview/assistant/prep?jd_id=${jdId}&resume_version_id=${resumeVersionId}`);
      if (!res.ok) throw new Error("Failed to fetch prep cards");
      const data = await res.json();
      set({ prepCards: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchJDsList: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/jd`);
      if (!res.ok) throw new Error("Failed to fetch job descriptions");
      const data = await res.json();
      set({ jdsList: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchResumeVersionsList: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/resume/versions`);
      if (!res.ok) throw new Error("Failed to fetch resume versions");
      const data = await res.json();
      set({ resumeVersionsList: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
