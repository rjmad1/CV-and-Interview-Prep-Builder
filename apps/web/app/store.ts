import { create } from "zustand";
import { apiFetch, API_BASE } from "./api/apiFetch";
import type {
  DocumentInfo,
  SkillGap,
  JDAnalysis,
  JDListItem,
  EvidenceItem,
  ResumeVersion,
  ResumeVersionListItem,
  ATSReport,
  HallucinationEvent,
  VerifyClaimResponse,
  Application,
  InterviewRound,
  InterviewSession,
  CoverLetterVersionItem,
  PrepCards,
} from "./types";

// Re-export types so existing consumers don't break
export type {
  DocumentInfo,
  SkillGap,
  JDAnalysis,
  EvidenceItem,
  ResumeVersion,
  ATSReport,
  HallucinationEvent,
  VerifyClaimResponse,
  Application,
  InterviewRound,
  InterviewSession,
};

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
  prepCards: PrepCards | null;
  jdsList: JDListItem[];
  resumeVersionsList: ResumeVersionListItem[];
  coverLettersList: CoverLetterVersionItem[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  uploadDocumentWithType: (file: File, documentType: string) => Promise<void>;
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
  fetchCoverLettersList: () => Promise<void>;
  restoreResumeVersion: (id: string) => Promise<void>;
  duplicateResumeVersion: (id: string) => Promise<void>;
  branchResumeVersion: (id: string, branchName: string) => Promise<void>;
  renameResumeVersion: (id: string, branchName: string, changeSummary?: string) => Promise<void>;
  archiveResumeVersion: (id: string, archive: boolean) => Promise<void>;
  deleteResumeVersion: (id: string) => Promise<void>;
  saveCoverLetter: (generatedText: string, jdId?: string, branchName?: string, changeSummary?: string) => Promise<void>;
  renameCoverLetter: (id: string, branchName: string, changeSummary?: string) => Promise<void>;
  archiveCoverLetter: (id: string, archive: boolean) => Promise<void>;
  deleteCoverLetter: (id: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
  compareResumeVersions: (id1: string, id2: string) => Promise<string>;
  startInterview: (resumeId: string, jdId: string) => Promise<void>;
  submitInterviewResponse: (response: string) => Promise<void>;
  fetchInterviewReport: () => Promise<void>;
}

const API_URL = API_BASE;


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
      const res = await apiFetch(`${API_URL}/resume/generate`, {
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
      const res = await apiFetch(`${API_URL}/ats/optimize`, {
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
      const res = await apiFetch(`${API_URL}/resume/${resumeId}/diff`);
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
      const res = await apiFetch(`${API_URL}/ats/${resumeId}`);
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
      const res = await apiFetch(`${API_URL}/interview/start`, {
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
      const res = await apiFetch(`${API_URL}/interview/respond`, {
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
      const res = await apiFetch(`${API_URL}/interview/report?session_id=${session.session_id}`);
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
      const res = await apiFetch(`${API_URL}/evidence/hallucinations`);
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
      const res = await apiFetch(`${API_URL}/evidence/override`, {
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
      const res = await apiFetch(`${API_URL}/evidence/verify`, {
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
      const res = await apiFetch(`${API_URL}/applications`);
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
      const res = await apiFetch(`${API_URL}/applications`, {
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
      const res = await apiFetch(`${API_URL}/applications/${id}`, {
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
      const res = await apiFetch(`${API_URL}/applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete application");
      await get().fetchApplications();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchInterviews: async (applicationId: string) => {
    try {
      const res = await apiFetch(`${API_URL}/applications/${applicationId}/interviews`);
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
      const res = await apiFetch(`${API_URL}/applications/${applicationId}/interviews`, {
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
      const res = await apiFetch(`${API_URL}/applications/${applicationId}/outcome`, {
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
      const res = await apiFetch(`${API_URL}/cover-letter/generate`, {
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
      const res = await apiFetch(`${API_URL}/interview/assistant/prep?jd_id=${jdId}&resume_version_id=${resumeVersionId}`);
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
      const res = await apiFetch(`${API_URL}/jd`);
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
      const res = await apiFetch(`${API_URL}/resume/versions`);
      if (!res.ok) throw new Error("Failed to fetch resume versions");
      const data = await res.json();
      set({ resumeVersionsList: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  coverLettersList: [],

  uploadDocumentWithType: async (file: File, documentType: string) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`${API_URL}/documents/scan?document_type=${documentType}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      await get().fetchDocuments();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchCoverLettersList: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/cover-letter/versions`);
      if (!res.ok) throw new Error("Failed to fetch cover letter versions");
      const data = await res.json();
      set({ coverLettersList: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  restoreResumeVersion: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/resume/versions/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to restore version");
      await get().fetchResumeVersionsList();
      await get().fetchDocuments();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  duplicateResumeVersion: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/resume/versions/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to duplicate version");
      await get().fetchResumeVersionsList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  branchResumeVersion: async (id: string, branchName: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/resume/versions/${id}/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_name: branchName }),
      });
      if (!res.ok) throw new Error("Failed to branch version");
      await get().fetchResumeVersionsList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  renameResumeVersion: async (id: string, branchName: string, changeSummary?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/resume/versions/${id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_name: branchName, change_summary: changeSummary }),
      });
      if (!res.ok) throw new Error("Failed to rename version");
      await get().fetchResumeVersionsList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  archiveResumeVersion: async (id: string, archive: boolean) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/resume/versions/${id}/archive?archive=${archive}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive version");
      await get().fetchResumeVersionsList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  deleteResumeVersion: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/resume/versions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete version");
      await get().fetchResumeVersionsList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  saveCoverLetter: async (generatedText: string, jdId?: string, branchName?: string, changeSummary?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/cover-letter/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generated_text: generatedText,
          jd_id: jdId,
          branch_name: branchName || "main",
          change_summary: changeSummary || "Initial version",
        }),
      });
      if (!res.ok) throw new Error("Failed to save cover letter");
      await get().fetchCoverLettersList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  renameCoverLetter: async (id: string, branchName: string, changeSummary?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/cover-letter/versions/${id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_name: branchName, change_summary: changeSummary }),
      });
      if (!res.ok) throw new Error("Failed to rename cover letter");
      await get().fetchCoverLettersList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  archiveCoverLetter: async (id: string, archive: boolean) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/cover-letter/versions/${id}/archive?archive=${archive}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive cover letter");
      await get().fetchCoverLettersList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  deleteCoverLetter: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/cover-letter/versions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete cover letter");
      await get().fetchCoverLettersList();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  resetDatabase: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API_URL}/cleanup/reset`, { method: "POST" });
      if (!res.ok) throw new Error("Reset failed");
      set({
        documents: [],
        jdAnalysis: null,
        optimizedResume: null,
        atsReport: null,
        interview: null,
        evidenceChunks: [],
        hallucinations: [],
        applications: [],
        coverLetter: null,
        prepCards: null,
        jdsList: [],
        resumeVersionsList: [],
        coverLettersList: [],
        loading: false,
      });
      await get().fetchDocuments();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  compareResumeVersions: async (id1: string, id2: string) => {
    try {
      const res = await apiFetch(`${API_URL}/resume/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id_1: id1, version_id_2: id2 }),
      });
      if (!res.ok) throw new Error("Comparison failed");
      const data = await res.json();
      return data.diff;
    } catch (err: any) {
      console.error(err);
      return "Error: Could not retrieve diff comparison.";
    }
  },
}));
