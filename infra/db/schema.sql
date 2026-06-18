-- ============================================================================
-- Career Intelligence Studio (CIS) - PostgreSQL Production DDL Schema
-- Migrations 001 through 007 (Continuous Deployment Sequence)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MIGRATION 001: Core Tables & Tenant Baseline
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'resume', 'verification', 'achievement'
    parsed_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding_vector_id UUID, -- References vectors stored in Qdrant
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- MIGRATION 002: Career Repository
-- ============================================================================

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'technical', 'soft', 'domain'
    proficiency_level VARCHAR(50), -- 'beginner', 'intermediate', 'expert'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_user_skill UNIQUE(user_id, name)
);

CREATE TABLE experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT NOT NULL,
    is_current BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    credential_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    grade VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date_achieved DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- MIGRATION 003: Job Description Intelligence
-- ============================================================================

CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    raw_text TEXT NOT NULL,
    url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE skill_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jd_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    importance VARCHAR(50) DEFAULT 'medium' NOT NULL, -- 'high', 'medium', 'low'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE gap_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jd_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    importance VARCHAR(50) NOT NULL,
    match_status VARCHAR(50) NOT NULL, -- 'matched', 'gap', 'partial'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- MIGRATION 004: Evidence Grounding Layer
-- ============================================================================

CREATE TABLE generation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL, -- 'resume_optimization', 'interview_prep'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE evidence_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE trace_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id UUID NOT NULL REFERENCES evidence_bundles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    confidence_score NUMERIC(5, 4) NOT NULL,
    mapping_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hallucination_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_snippet TEXT NOT NULL,
    validation_status VARCHAR(50) NOT NULL, -- 'rejected', 'overridden'
    audit_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- MIGRATION 005: Resume System
-- ============================================================================

CREATE TABLE resume_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Null if global system templates
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    layout_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES resume_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    jd_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
    generated_text TEXT NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    evidence_bundle_id UUID REFERENCES evidence_bundles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_resume_version UNIQUE(user_id, template_id, version_number)
);

CREATE TABLE resume_diffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_version_id UUID NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diff_patch TEXT NOT NULL,
    modified_sections JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- MIGRATION 006: ATS Explainability
-- ============================================================================

CREATE TABLE ats_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_version_id UUID NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ats_score NUMERIC(5, 2) NOT NULL,
    keyword_coverage NUMERIC(5, 4) NOT NULL,
    semantic_match NUMERIC(5, 4) NOT NULL,
    readability_score NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE keyword_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ats_report_id UUID NOT NULL REFERENCES ats_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    found BOOLEAN DEFAULT FALSE NOT NULL,
    frequency INT DEFAULT 0 NOT NULL,
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- MIGRATION 007: Applications & Interviews
-- ============================================================================

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jd_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    resume_version_id UUID NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'applied' NOT NULL, -- 'applied', 'interviewing', 'rejected', 'offered'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    round_number INT DEFAULT 1 NOT NULL,
    interviewer_info TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' NOT NULL, -- 'scheduled', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outcome_type VARCHAR(50) NOT NULL, -- 'offer', 'rejection', 'withdraw'
    feedback TEXT,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_document_chunks_doc ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_user ON document_chunks(user_id);
CREATE INDEX idx_experiences_user ON experiences(user_id);
CREATE INDEX idx_job_descriptions_user ON job_descriptions(user_id);
CREATE INDEX idx_trace_records_bundle ON trace_records(bundle_id);
CREATE INDEX idx_resume_versions_user ON resume_versions(user_id);
CREATE INDEX idx_ats_reports_resume ON ats_reports(resume_version_id);
CREATE INDEX idx_applications_user ON applications(user_id);


-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES FOR TENANT ISOLATION
-- ============================================================================

-- Enable RLS on all tenant-facing tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hallucination_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

-- Construct security isolation policies using app configuration settings
-- The session local parameter `app.current_user_id` holds the authenticated user ID.

CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_chunks ON document_chunks
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_skills ON skills
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_experiences ON experiences
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_certifications ON certifications
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_education ON education
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_achievements ON achievements
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_jd ON job_descriptions
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_gap ON gap_analysis
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_sessions ON generation_sessions
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_bundles ON evidence_bundles
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_traces ON trace_records
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_hallucinations ON hallucination_events
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_templates ON resume_templates
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid OR user_id IS NULL);

CREATE POLICY tenant_isolation_versions ON resume_versions
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_diffs ON resume_diffs
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_ats ON ats_reports
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_keywords ON keyword_analysis
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_applications ON applications
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_interviews ON interviews
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY tenant_isolation_outcomes ON outcomes
    FOR ALL USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
