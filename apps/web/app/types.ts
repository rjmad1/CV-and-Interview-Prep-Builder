/**
 * Shared TypeScript domain types for the Career Intelligence Studio frontend.
 *
 * All API response/request shapes are defined here once and imported wherever needed.
 * This replaces the inline interface declarations that were co-located with the store.
 */

export interface DocumentInfo {
  id: string;
  filename: string;
  document_type: string;
  parsed_text: string | null;
  is_archived: boolean;
  metadata: Record<string, unknown>;
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

export interface JDListItem {
  id: string;
  company: string;
  title: string;
  is_archived: boolean;
  created_at: string;
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

export interface ResumeVersionListItem {
  id: string;
  version_number: number;
  jd_title: string | null;
  jd_company: string | null;
  branch_name: string;
  change_summary: string | null;
  is_archived: boolean;
  created_at: string;
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
  report?: InterviewReport;
}

export interface InterviewReport {
  readiness_score: number;
  key_strengths: string[];
  improvement_areas: string[];
  transcript: { speaker: string; text: string }[];
}

export interface CoverLetterVersionItem {
  id: string;
  version_number: number;
  jd_title: string | null;
  jd_company: string | null;
  generated_text: string;
  branch_name: string;
  change_summary: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface STARStory {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface TechnicalFlashcard {
  question: string;
  answer: string;
}

export interface PrepCards {
  star_stories: STARStory[];
  technical_flashcards: TechnicalFlashcard[];
  behavioral_tips: string[];
}
