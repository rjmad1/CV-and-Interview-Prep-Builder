"""Resume router — generate, fetch, diff, version management, and vault endpoints."""
import difflib
import io
import logging
import os
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.config import settings
from apps.api.src.database import get_db
from apps.api.src.graph.evidence_retrieval import evidence_retrieval_graph
from apps.api.src.graph.resume_optimization import resume_optimization_graph
from apps.api.src.models import (
    Document,
    DocumentChunk,
    EvidenceBundle,
    GenerationSession,
    JobDescription,
    ResumeDiff,
    ResumeTemplate,
    ResumeVersion,
    SkillRequirement,
    TraceRecord,
    User,
)
from apps.api.src.routers.deps import get_current_user
from apps.api.src.utils.encryption import read_vault_file
from apps.api.src.utils.pdf_generator import convert_docx_to_pdf

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api/resume", tags=["Resume"])


# --- Schemas ---

class EvidenceItem(BaseModel):
    chunk_id: uuid.UUID
    confidence: float
    text_snippet: str


class ResumeGenerateRequest(BaseModel):
    template_id: uuid.UUID
    jd_id: uuid.UUID
    selected_evidence_ids: list[uuid.UUID]


class ResumeResponse(BaseModel):
    resume_id: uuid.UUID
    version: int
    generated_text: str
    evidence_bundle: list[EvidenceItem]


class ResumeDiffResponse(BaseModel):
    resume_id: uuid.UUID
    diff: str


class ResumeTemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    is_active: bool


class ResumeVersionListResponse(BaseModel):
    id: uuid.UUID
    version_number: int
    jd_title: str | None
    jd_company: str | None
    branch_name: str
    change_summary: str | None
    is_archived: bool
    created_at: Any


class BranchVersionRequest(BaseModel):
    branch_name: str
    change_summary: str | None = None


class RenameVersionRequest(BaseModel):
    branch_name: str
    change_summary: str | None = None


class CompareVersionsRequest(BaseModel):
    version_id_1: uuid.UUID
    version_id_2: uuid.UUID


# --- Helpers ---

async def _fetch_evidence_for_version(
    db: AsyncSession, rv: ResumeVersion
) -> list[EvidenceItem]:
    """Loads evidence items for a resume version via its TraceRecord links."""
    if not rv.evidence_bundle_id:
        return []
    result_traces = await db.execute(
        select(TraceRecord).filter(TraceRecord.bundle_id == rv.evidence_bundle_id)
    )
    traces = result_traces.scalars().all()
    chunk_ids = [t.chunk_id for t in traces]
    result_chunks = await db.execute(
        select(DocumentChunk).filter(DocumentChunk.id.in_(chunk_ids))
    )
    chunks_by_id = {c.id: c for c in result_chunks.scalars().all()}
    return [
        EvidenceItem(
            chunk_id=t.chunk_id,
            confidence=float(t.confidence_score),
            text_snippet=chunks_by_id[t.chunk_id].chunk_text,
        )
        for t in traces
        if t.chunk_id in chunks_by_id
    ]


# --- Routes ---

@router.get("/templates/active", response_model=ResumeTemplateResponse)
async def get_active_template(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Returns the user's active resume template."""
    result = await db.execute(
        select(ResumeTemplate).filter(
            ResumeTemplate.user_id == user.id, ResumeTemplate.is_active == True  # noqa: E712
        )
    )
    template = result.scalars().first()
    if not template:
        result2 = await db.execute(
            select(ResumeTemplate).filter(ResumeTemplate.user_id == user.id)
        )
        template = result2.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="No active template found. Please reset the application.")
    return ResumeTemplateResponse(id=template.id, name=template.name, is_active=template.is_active)


@router.get("/versions", response_model=list[ResumeVersionListResponse])
async def list_resume_versions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all generated resume versions with JD details — single JOIN query (no N+1)."""
    result = await db.execute(
        select(ResumeVersion, JobDescription)
        .outerjoin(JobDescription, ResumeVersion.jd_id == JobDescription.id)
        .filter(ResumeVersion.user_id == user.id)
        .order_by(ResumeVersion.created_at.desc())
    )
    rows = result.all()
    return [
        ResumeVersionListResponse(
            id=rv.id,
            version_number=rv.version_number,
            jd_title=jd.title if jd else None,
            jd_company=jd.company if jd else None,
            branch_name=rv.branch_name,
            change_summary=rv.change_summary,
            is_archived=rv.is_archived,
            created_at=rv.created_at,
        )
        for rv, jd in rows
    ]


@router.post("/generate", response_model=ResumeResponse)
async def generate_resume(
    request: ResumeGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generates an optimized resume grounded in evidence records."""
    NIL_UUID = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Resolve template
    if request.template_id == NIL_UUID:
        result_temp = await db.execute(
            select(ResumeTemplate).filter(
                ResumeTemplate.user_id == user.id, ResumeTemplate.is_active == True  # noqa
            )
        )
        template = result_temp.scalars().first()
        if not template:
            result_temp2 = await db.execute(
                select(ResumeTemplate).filter(ResumeTemplate.user_id == user.id)
            )
            template = result_temp2.scalars().first()
    else:
        result_temp = await db.execute(
            select(ResumeTemplate).filter(ResumeTemplate.id == request.template_id)
        )
        template = result_temp.scalars().first()

    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == request.jd_id)
    )
    jd = result_jd.scalars().first()

    if not template or not jd:
        raise HTTPException(status_code=404, detail="Template or Job Description not found.")

    # Fetch base resume text
    result_doc = await db.execute(
        select(Document).filter(
            Document.user_id == user.id,
            Document.document_type == "resume",
            Document.is_archived == False,  # noqa
        )
    )
    doc = result_doc.scalars().first()
    original_text = doc.parsed_text if doc else "Senior Developer Python backend."

    # Create GenerationSession
    session_id = uuid.uuid4()
    sess = GenerationSession(id=session_id, user_id=user.id, session_type="resume_optimization")
    db.add(sess)
    await db.commit()

    # Build evidence bundle
    if request.selected_evidence_ids:
        result_chunks = await db.execute(
            select(DocumentChunk).filter(
                DocumentChunk.id.in_(request.selected_evidence_ids),
                DocumentChunk.user_id == user.id,
            )
        )
        chunks = result_chunks.scalars().all()

        bundle_id = uuid.uuid4()
        ev_bundle = EvidenceBundle(
            id=bundle_id,
            session_id=session_id,
            user_id=user.id,
            name=f"Selected Evidence Bundle - Session {str(session_id)[:8]}",
        )
        db.add(ev_bundle)
        await db.commit()

        bundle_items = []
        for rank, chunk in enumerate(chunks):
            db.add(TraceRecord(
                id=uuid.uuid4(),
                bundle_id=bundle_id,
                user_id=user.id,
                chunk_id=chunk.id,
                confidence_score=0.95,
                mapping_reason="Directly selected by user.",
            ))
            bundle_items.append({
                "chunk_id": str(chunk.id),
                "confidence": 0.95,
                "text_snippet": chunk.chunk_text,
            })
        await db.commit()
        bundle = {"bundle_id": str(bundle_id), "items": bundle_items}
    else:
        result_reqs = await db.execute(
            select(SkillRequirement).filter(SkillRequirement.jd_id == jd.id)
        )
        reqs = result_reqs.scalars().all()
        req_names = [r.skill_name for r in reqs] if reqs else ["Python", "FastAPI"]

        retrieval_res = await evidence_retrieval_graph.ainvoke({
            "user_id": str(user.id),
            "session_id": str(session_id),
            "jd_requirements": req_names,
            "sparse_results": [],
            "dense_results": [],
            "merged_results": [],
            "reranked_results": [],
            "evidence_bundle": {},
            "status": "initiated",
        })
        bundle = retrieval_res.get("evidence_bundle", {"bundle_id": str(uuid.uuid4()), "items": []})

    # Run LangGraph optimization
    try:
        opt_res = await resume_optimization_graph.ainvoke({
            "user_id": str(user.id),
            "session_id": str(session_id),
            "resume_id": str(doc.id) if doc else str(uuid.uuid4()),
            "template_id": str(template.id),
            "jd_id": str(jd.id),
            "evidence_bundle": bundle,
            "target_sections": [],
            "original_text": original_text,
            "optimized_text": "",
            "validation_status": "",
            "version_diff": "",
            "output_path": "",
            "status": "initiated",
        })
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Anti-Hallucination block: {exc}",
        ) from exc

    # Retrieve newly saved version
    result_latest = await db.execute(
        select(ResumeVersion)
        .filter(ResumeVersion.user_id == user.id, ResumeVersion.template_id == template.id)
        .order_by(ResumeVersion.version_number.desc())
    )
    latest_version = result_latest.scalars().first()

    return ResumeResponse(
        resume_id=latest_version.id if latest_version else uuid.uuid4(),
        version=latest_version.version_number if latest_version else 1,
        generated_text=opt_res.get("optimized_text", ""),
        evidence_bundle=[
            EvidenceItem(
                chunk_id=uuid.UUID(item["chunk_id"]),
                confidence=item["confidence"],
                text_snippet=item["text_snippet"],
            )
            for item in bundle.get("items", [])
        ],
    )


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieves a specific generated resume version."""
    result = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == resume_id, ResumeVersion.user_id == user.id)
    )
    rv = result.scalars().first()
    if not rv:
        raise HTTPException(status_code=404, detail="Resume version not found.")
    evidence_items = await _fetch_evidence_for_version(db, rv)
    return ResumeResponse(
        resume_id=rv.id,
        version=rv.version_number,
        generated_text=rv.generated_text,
        evidence_bundle=evidence_items,
    )


@router.get("/{resume_id}/diff", response_model=ResumeDiffResponse)
async def get_resume_diff(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Returns the unified diff patch for a resume version."""
    result = await db.execute(
        select(ResumeDiff).filter(
            ResumeDiff.resume_version_id == resume_id, ResumeDiff.user_id == user.id
        )
    )
    diff = result.scalars().first()
    if not diff:
        raise HTTPException(status_code=404, detail="Diff not found for this version.")
    return ResumeDiffResponse(resume_id=resume_id, diff=diff.diff_patch)


@router.post("/compare")
async def compare_resume_versions(
    request: CompareVersionsRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generates a unified diff between two resume versions."""
    res1 = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == request.version_id_1, ResumeVersion.user_id == user.id)
    )
    v1 = res1.scalars().first()
    res2 = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == request.version_id_2, ResumeVersion.user_id == user.id)
    )
    v2 = res2.scalars().first()
    if not v1 or not v2:
        raise HTTPException(status_code=404, detail="One or both resume versions not found.")

    diff = difflib.unified_diff(
        v1.generated_text.splitlines(),
        v2.generated_text.splitlines(),
        fromfile=f"v{v1.version_number}",
        tofile=f"v{v2.version_number}",
        lineterm="",
    )
    return {"diff": "\n".join(diff)}


@router.post("/versions/{version_id}/restore", response_model=ResumeResponse)
async def restore_resume_version(
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Restores a previous resume version by creating a new active copy from it."""
    from sqlalchemy import update

    result = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == version_id, ResumeVersion.user_id == user.id)
    )
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found.")

    await db.execute(
        update(ResumeVersion)
        .where(ResumeVersion.user_id == user.id, ResumeVersion.template_id == v.template_id)
        .values(is_archived=True)
    )
    await db.commit()

    count_res = await db.execute(
        select(func.count(ResumeVersion.id)).filter(
            ResumeVersion.user_id == user.id, ResumeVersion.template_id == v.template_id
        )
    )
    count = count_res.scalar() or 0

    new_v = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=v.template_id,
        version_number=count + 1,
        jd_id=v.jd_id,
        generated_text=v.generated_text,
        file_path=v.file_path,
        evidence_bundle_id=v.evidence_bundle_id,
        parent_version_id=v.id,
        branch_name=v.branch_name,
        change_summary=f"Restored from version {v.version_number}",
        is_archived=False,
    )
    db.add(new_v)
    await db.commit()
    return ResumeResponse(resume_id=new_v.id, version=new_v.version_number, generated_text=new_v.generated_text, evidence_bundle=[])


@router.post("/versions/{version_id}/duplicate", response_model=ResumeResponse)
async def duplicate_resume_version(
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Duplicates a resume version."""
    result = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == version_id, ResumeVersion.user_id == user.id)
    )
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found.")

    count_res = await db.execute(
        select(func.count(ResumeVersion.id)).filter(
            ResumeVersion.user_id == user.id, ResumeVersion.template_id == v.template_id
        )
    )
    count = count_res.scalar() or 0

    new_v = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=v.template_id,
        version_number=count + 1,
        jd_id=v.jd_id,
        generated_text=v.generated_text,
        file_path=v.file_path,
        evidence_bundle_id=v.evidence_bundle_id,
        parent_version_id=v.id,
        branch_name=v.branch_name,
        change_summary=f"Duplicate of version {v.version_number}",
        is_archived=False,
    )
    db.add(new_v)
    await db.commit()
    return ResumeResponse(resume_id=new_v.id, version=new_v.version_number, generated_text=new_v.generated_text, evidence_bundle=[])


@router.post("/versions/{version_id}/branch", response_model=ResumeResponse)
async def branch_resume_version(
    version_id: uuid.UUID,
    request: BranchVersionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Creates a named branch from a resume version."""
    result = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == version_id, ResumeVersion.user_id == user.id)
    )
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found.")

    new_v = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=v.template_id,
        version_number=1,
        jd_id=v.jd_id,
        generated_text=v.generated_text,
        file_path=v.file_path,
        evidence_bundle_id=v.evidence_bundle_id,
        parent_version_id=v.id,
        branch_name=request.branch_name,
        change_summary=request.change_summary or f"Created branch '{request.branch_name}' from v{v.version_number}",
        is_archived=False,
    )
    db.add(new_v)
    await db.commit()
    return ResumeResponse(resume_id=new_v.id, version=new_v.version_number, generated_text=new_v.generated_text, evidence_bundle=[])


@router.post("/versions/{version_id}/rename")
async def rename_resume_version(
    version_id: uuid.UUID,
    request: RenameVersionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Renames a resume version branch."""
    result = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == version_id, ResumeVersion.user_id == user.id)
    )
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found.")
    v.branch_name = request.branch_name
    if request.change_summary:
        v.change_summary = request.change_summary
    await db.commit()
    return {"status": "success", "message": "Version renamed successfully."}


@router.post("/versions/{version_id}/archive")
async def archive_resume_version(
    version_id: uuid.UUID,
    archive: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Archives or unarchives a resume version."""
    result = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == version_id, ResumeVersion.user_id == user.id)
    )
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found.")
    v.is_archived = archive
    await db.commit()
    return {"status": "success", "message": f"Version {'archived' if archive else 'unarchived'} successfully."}


@router.delete("/versions/{version_id}")
async def delete_resume_version(
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Deletes a resume version from DB and disk."""
    result = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == version_id, ResumeVersion.user_id == user.id)
    )
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found.")
    if v.file_path and os.path.exists(v.file_path):
        try:
            os.remove(v.file_path)
        except Exception as exc:
            logger.error(f"Failed to remove resume file: {exc}")
    await db.delete(v)
    await db.commit()
    return {"status": "success", "message": "Version deleted successfully."}


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: uuid.UUID,
    format: str = Query("docx", description="Download format: docx or pdf"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Downloads a resume version as DOCX or PDF."""
    result = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == resume_id, ResumeVersion.user_id == user.id)
    )
    v = result.scalars().first()
    if not v or not v.file_path:
        raise HTTPException(status_code=404, detail="Resume version not found.")

    file_bytes = read_vault_file(v.file_path, decrypt=settings.STORAGE_ENCRYPTION_ACTIVE)

    if format.lower() == "docx":
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=resume_v{v.version_number}.docx"},
        )
    if format.lower() == "pdf":
        pdf_path = v.file_path.replace(".docx", f"_v{v.version_number}.pdf")
        temp_docx = v.file_path + ".temp.docx"
        with open(temp_docx, "wb") as f_tmp:
            f_tmp.write(file_bytes)
        try:
            convert_docx_to_pdf(temp_docx, pdf_path)
            with open(pdf_path, "rb") as f_pdf:
                pdf_bytes = f_pdf.read()
        finally:
            for p in (temp_docx, pdf_path):
                try:
                    os.remove(p)
                except Exception:
                    pass
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=resume_v{v.version_number}.pdf"},
        )
    raise HTTPException(status_code=400, detail="Unsupported format. Choose 'docx' or 'pdf'.")
