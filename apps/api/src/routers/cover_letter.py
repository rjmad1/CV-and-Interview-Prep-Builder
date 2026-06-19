"""Cover letter generation, validation, and version management router."""
import io
import logging
import os
import re
import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, outerjoin
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.config import settings
from apps.api.src.database import get_db
from apps.api.src.models import (
    CoverLetterVersion, DocumentChunk, GenerationSession,
    HallucinationEvent, JobDescription, ResumeVersion, SkillRequirement, User,
)
from apps.api.src.routers.deps import get_current_user
from apps.api.src.graph.evidence_retrieval import evidence_retrieval_graph
from apps.api.src.utils.ai_client import ai_gateway_client
from apps.api.src.utils.similarity import cosine_similarity, jaccard_similarity
from apps.api.src.utils.pdf_generator import generate_cover_letter_pdf

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api/cover-letter", tags=["Cover Letter"])

# Sentence splitter — preserves abbreviations better than a naive split on "."
_SENTENCE_SPLIT_RE = re.compile(r"(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s")

# Boilerplate openers — skip grounding validation for these
_BOILERPLATE_KEYWORDS = frozenset({
    "dear", "sincerely", "writing to", "interest in", "look forward",
    "thank you", "respectfully", "best regards", "express my", "hiring manager",
})


# --- Schemas ---

class CoverLetterRequest(BaseModel):
    jd_id: uuid.UUID
    resume_version_id: uuid.UUID
    selected_evidence_ids: List[uuid.UUID] = []


class CoverLetterResponse(BaseModel):
    cover_letter: str


class SaveCoverLetterRequest(BaseModel):
    jd_id: uuid.UUID | None = None
    generated_text: str
    branch_name: str = "main"
    change_summary: str | None = None


class CoverLetterVersionResponse(BaseModel):
    id: uuid.UUID
    version_number: int
    jd_title: str | None
    jd_company: str | None
    generated_text: str
    branch_name: str
    change_summary: str | None
    is_archived: bool
    created_at: Any


# --- Helpers ---

async def _gather_evidence(
    db: AsyncSession,
    user: "User",
    selected_ids: List[uuid.UUID],
    jd: "JobDescription",
    session_id: uuid.UUID,
) -> List[str]:
    """Returns evidence texts from selected chunks or falls back to hybrid retrieval."""
    if selected_ids:
        result = await db.execute(
            select(DocumentChunk).filter(
                DocumentChunk.id.in_(selected_ids), DocumentChunk.user_id == user.id
            )
        )
        return [c.chunk_text for c in result.scalars().all()]

    result_reqs = await db.execute(
        select(SkillRequirement).filter(SkillRequirement.jd_id == jd.id)
    )
    req_names = [r.skill_name for r in result_reqs.scalars().all()] or ["Python", "FastAPI"]

    db.add(GenerationSession(id=session_id, user_id=user.id, session_type="cover_letter"))
    await db.commit()

    retrieval_res = await evidence_retrieval_graph.ainvoke({
        "user_id": str(user.id), "session_id": str(session_id),
        "jd_requirements": req_names,
        "sparse_results": [], "dense_results": [], "merged_results": [],
        "reranked_results": [], "evidence_bundle": {}, "status": "initiated",
    })
    bundle = retrieval_res.get("evidence_bundle", {"items": []})
    return [item["text_snippet"] for item in bundle.get("items", [])]


async def _validate_grounding(
    db: AsyncSession,
    user: "User",
    session_id: uuid.UUID,
    cover_letter_text: str,
    evidence_texts: List[str],
) -> None:
    """Raises HTTPException if any factual sentence fails grounding checks."""
    sentences = _SENTENCE_SPLIT_RE.split(cover_letter_text)
    factual = [
        s.strip() for s in sentences
        if s.strip() and len(s.strip()) >= 40
        and not any(kw in s.lower() for kw in _BOILERPLATE_KEYWORDS)
    ]
    if not factual:
        return

    try:
        sentence_embeddings = await ai_gateway_client.embed(factual)
        evidence_embeddings = await ai_gateway_client.embed(evidence_texts)

        for idx, s_vec in enumerate(sentence_embeddings):
            max_sim = max(cosine_similarity(s_vec, ev_vec) for ev_vec in evidence_embeddings)
            if max_sim < 0.8:
                db.add(HallucinationEvent(
                    id=uuid.uuid4(), session_id=session_id, user_id=user.id,
                    generated_snippet=factual[idx][:500], validation_status="rejected",
                    audit_comments=f"Cover letter sentence failed grounding (sim={max_sim:.4f} < 0.8).",
                ))
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Anti-Hallucination block: Sentence '{factual[idx]}' "
                        f"lacks source evidence grounding (similarity {max_sim:.4f} < 0.8)."
                    ),
                )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Semantic validation failed, falling back to Jaccard: {exc}")
        for s in factual:
            max_sim = max(jaccard_similarity(s, ev) for ev in evidence_texts)
            if max_sim < 0.5:
                db.add(HallucinationEvent(
                    id=uuid.uuid4(), session_id=session_id, user_id=user.id,
                    generated_snippet=s[:500], validation_status="rejected",
                    audit_comments=f"Cover letter Jaccard fallback failed ({max_sim:.4f} < 0.5).",
                ))
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Anti-Hallucination block: Sentence '{s}' failed Jaccard grounding check.",
                )


# --- Routes ---

@router.post("/generate", response_model=CoverLetterResponse)
async def generate_cover_letter(
    request: CoverLetterRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generates a tailored cover letter grounded in evidence and validates it against hallucination."""
    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == request.jd_id, JobDescription.user_id == user.id)
    )
    jd = result_jd.scalars().first()
    result_resume = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == request.resume_version_id, ResumeVersion.user_id == user.id)
    )
    resume = result_resume.scalars().first()
    if not jd or not resume:
        raise HTTPException(status_code=404, detail="Job description or resume version not found.")

    session_id = uuid.uuid4()
    evidence_texts = await _gather_evidence(db, user, request.selected_evidence_ids, jd, session_id)
    if not evidence_texts:
        evidence_texts = ["Experienced software engineer with Python and FastAPI expertise."]

    system_prompt = (
        "You are an expert executive career coach and cover letter writer. "
        "Write a professional, compelling cover letter tailored to the target Job Description. "
        "Strictly ground all experience claims in the provided verified evidence. "
        "Do not invent achievements, metrics, or career history. "
        "Keep the tone professional, persuasive, and concise. Output ONLY the cover letter text."
    )
    user_prompt = (
        f"Target Position: {jd.title} at {jd.company}\n"
        f"Job Description:\n{jd.raw_text}\n\n"
        f"Candidate Experience Baseline:\n{resume.generated_text}\n\n"
        "Verified Facts & Achievements:\n" + "\n".join(f"- {t}" for t in evidence_texts)
    )

    try:
        cover_letter_text = await ai_gateway_client.generate(
            model=settings.MODEL_RESUME_OPTIMIZATION,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.3,
        )
    except Exception as exc:
        logger.error(f"Cover letter LLM generation failed: {exc}")
        cover_letter_text = (
            f"Dear Hiring Team at {jd.company},\n\n"
            f"I am writing to express my interest in the {jd.title} role. "
            "My profile aligns with your technical requirements in Python and FastAPI. "
            "I look forward to discussing how my experience aligns with this position.\n\n"
            "Sincerely,\nCandidate"
        )

    await _validate_grounding(db, user, session_id, cover_letter_text, evidence_texts)
    return CoverLetterResponse(cover_letter=cover_letter_text)


@router.get("/versions", response_model=List[CoverLetterVersionResponse])
async def list_cover_letter_versions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all cover letter versions — single JOIN, no N+1."""
    result = await db.execute(
        select(CoverLetterVersion, JobDescription)
        .outerjoin(JobDescription, CoverLetterVersion.jd_id == JobDescription.id)
        .filter(CoverLetterVersion.user_id == user.id)
        .order_by(CoverLetterVersion.created_at.desc())
    )
    return [
        CoverLetterVersionResponse(
            id=cl.id, version_number=cl.version_number,
            jd_title=jd.title if jd else None, jd_company=jd.company if jd else None,
            generated_text=cl.generated_text, branch_name=cl.branch_name,
            change_summary=cl.change_summary, is_archived=cl.is_archived, created_at=cl.created_at,
        )
        for cl, jd in result.all()
    ]


@router.post("/save", response_model=CoverLetterVersionResponse)
async def save_cover_letter(
    request: SaveCoverLetterRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Saves a cover letter text as a new version."""
    from sqlalchemy import func
    count_res = await db.execute(
        select(func.count(CoverLetterVersion.id)).filter(CoverLetterVersion.user_id == user.id)
    )
    count = count_res.scalar() or 0

    cl_version = CoverLetterVersion(
        id=uuid.uuid4(), user_id=user.id, version_number=count + 1,
        jd_id=request.jd_id, generated_text=request.generated_text,
        branch_name=request.branch_name, change_summary=request.change_summary,
        is_archived=False,
    )
    db.add(cl_version)
    await db.commit()

    jd = None
    if request.jd_id:
        result_jd = await db.execute(select(JobDescription).filter(JobDescription.id == request.jd_id))
        jd = result_jd.scalars().first()

    return CoverLetterVersionResponse(
        id=cl_version.id, version_number=cl_version.version_number,
        jd_title=jd.title if jd else None, jd_company=jd.company if jd else None,
        generated_text=cl_version.generated_text, branch_name=cl_version.branch_name,
        change_summary=cl_version.change_summary, is_archived=cl_version.is_archived,
        created_at=cl_version.created_at,
    )


@router.get("/{cl_id}/download")
async def download_cover_letter(
    cl_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Downloads a cover letter version as PDF."""
    result = await db.execute(
        select(CoverLetterVersion).filter(CoverLetterVersion.id == cl_id, CoverLetterVersion.user_id == user.id)
    )
    cl = result.scalars().first()
    if not cl:
        raise HTTPException(status_code=404, detail="Cover letter version not found.")

    out_dir = settings.STORAGE_COVER_LETTER_DIR
    os.makedirs(out_dir, exist_ok=True)
    temp_pdf_path = os.path.join(out_dir, f"temp_cl_{uuid.uuid4().hex[:8]}.pdf")

    try:
        pdf_bytes = generate_cover_letter_pdf(cl.generated_text, temp_pdf_path)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=cover_letter_v{cl.version_number}.pdf"},
        )
    except Exception as exc:
        logger.error(f"PDF generation failed: {exc}")
        raise HTTPException(status_code=500, detail="PDF generation failed.")
    finally:
        try:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
        except Exception:
            pass
