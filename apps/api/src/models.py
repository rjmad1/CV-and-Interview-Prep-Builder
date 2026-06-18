import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, DateTime, Date, Numeric, JSON, UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from apps.api.src.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50), default="user", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    mime_type = Column(String(100), nullable=False)
    document_type = Column(String(50), nullable=False)  # 'resume', 'verification', 'achievement'
    parsed_text = Column(Text)
    meta_data = Column("metadata", JSON().with_variant(JSONB, "postgresql"), default={}, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding_vector_id = Column(UUID(as_uuid=True))  # Matches Qdrant ID
    meta_data = Column("metadata", JSON().with_variant(JSONB, "postgresql"), default={}, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Skill(Base):
    __tablename__ = "skills"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # 'technical', 'soft', 'domain'
    proficiency_level = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Experience(Base):
    __tablename__ = "experiences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company_name = Column(String(255), nullable=False)
    role_title = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    description = Column(Text, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Certification(Base):
    __tablename__ = "certifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    issuing_organization = Column(String(255), nullable=False)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    credential_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Education(Base):
    __tablename__ = "education"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    institution = Column(String(255), nullable=False)
    degree = Column(String(255), nullable=False)
    field_of_study = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    grade = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    date_achieved = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class JobDescription(Base):
    __tablename__ = "job_descriptions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False)
    url = Column(String(512))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class SkillRequirement(Base):
    __tablename__ = "skill_requirements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)
    importance = Column(String(50), default="medium", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class GapAnalysis(Base):
    __tablename__ = "gap_analysis"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)
    importance = Column(String(50), nullable=False)
    match_status = Column(String(50), nullable=False)  # 'matched', 'gap', 'partial'
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class GenerationSession(Base):
    __tablename__ = "generation_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_type = Column(String(50), nullable=False)  # 'resume_optimization', 'interview_prep'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class EvidenceBundle(Base):
    __tablename__ = "evidence_bundles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("generation_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class TraceRecord(Base):
    __tablename__ = "trace_records"
    __table_args__ = {'extend_existing': True}
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bundle_id = Column(UUID(as_uuid=True), ForeignKey("evidence_bundles.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("document_chunks.id", ondelete="CASCADE"), nullable=False)
    confidence_score = Column(Numeric(5, 4), nullable=False)
    mapping_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class HallucinationEvent(Base):
    __tablename__ = "hallucination_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("generation_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    generated_snippet = Column(Text, nullable=False)
    validation_status = Column(String(50), nullable=False)  # 'rejected', 'overridden'
    audit_comments = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class ResumeTemplate(Base):
    __tablename__ = "resume_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    layout_metadata = Column(JSON().with_variant(JSONB, "postgresql"), default={}, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class ResumeVersion(Base):
    __tablename__ = "resume_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("resume_templates.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id", ondelete="SET NULL"))
    generated_text = Column(Text, nullable=False)
    file_path = Column(String(512), nullable=False)
    evidence_bundle_id = Column(UUID(as_uuid=True), ForeignKey("evidence_bundles.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class ResumeDiff(Base):
    __tablename__ = "resume_diffs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_version_id = Column(UUID(as_uuid=True), ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    diff_patch = Column(Text, nullable=False)
    modified_sections = Column(JSON().with_variant(JSONB, "postgresql"), default=[], nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class ATSReport(Base):
    __tablename__ = "ats_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_version_id = Column(UUID(as_uuid=True), ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ats_score = Column(Numeric(5, 2), nullable=False)
    keyword_coverage = Column(Numeric(5, 4), nullable=False)
    semantic_match = Column(Numeric(5, 4), nullable=False)
    readability_score = Column(Numeric(5, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class KeywordAnalysis(Base):
    __tablename__ = "keyword_analysis"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ats_report_id = Column(UUID(as_uuid=True), ForeignKey("ats_reports.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    keyword = Column(String(100), nullable=False)
    found = Column(Boolean, default=False, nullable=False)
    frequency = Column(Integer, default=0, nullable=False)
    recommendation = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Application(Base):
    __tablename__ = "applications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    resume_version_id = Column(UUID(as_uuid=True), ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="applied", nullable=False)  # 'applied', 'interviewing', 'rejected', 'offered'
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Interview(Base):
    __tablename__ = "interviews"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    round_number = Column(Integer, default=1, nullable=False)
    interviewer_info = Column(Text)
    status = Column(String(50), default="scheduled", nullable=False)  # 'scheduled', 'completed', 'cancelled'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Outcome(Base):
    __tablename__ = "outcomes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    outcome_type = Column(String(50), nullable=False)  # 'offer', 'rejection', 'withdraw'
    feedback = Column(Text)
    details = Column(JSON().with_variant(JSONB, "postgresql"), default={}, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
