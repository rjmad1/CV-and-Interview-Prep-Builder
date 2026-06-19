"""ATS router — scoring and keyword-driven ATS optimization."""
import difflib
import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, List

from apps.api.src.config import settings
from apps.api.src.database import get_db
from apps.api.src.models import (
    ATSReport, JobDescription, KeywordAnalysis, ResumeDiff, ResumeVersion, User,
)
from apps.api.src.routers.deps import get_current_user
from apps.api.src.engine.ats_scorer import ATSScorer

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api/ats", tags=["ATS"])


class ATSReportResponse(BaseModel):
    ats_score: float
    keyword_coverage: float
    semantic_match: float
    readability_score: float
    detailed_findings: Dict[str, Any]


class ATSOptimizeRequest(BaseModel):
    resume_version_id: uuid.UUID
    jd_id: uuid.UUID


class ATSOptimizeResponse(BaseModel):
    success: bool
    optimized_resume_id: uuid.UUID
    version: int
    initial_score: float
    new_score: float
    weaved_keywords: List[str]
    message: str


@router.get("/{resume_id}", response_model=ATSReportResponse)
async def get_ats_report(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Calculates ATS scores against the associated JD."""
    result_rv = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == resume_id, ResumeVersion.user_id == user.id)
    )
    rv = result_rv.scalars().first()
    if not rv:
        raise HTTPException(status_code=404, detail="Resume version not found.")

    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == rv.jd_id)
    )
    jd = result_jd.scalars().first()
    if not jd:
        raise HTTPException(status_code=404, detail="Associated Job Description not found.")

    from apps.api.src.models import SkillRequirement
    result_reqs = await db.execute(
        select(SkillRequirement).filter(SkillRequirement.jd_id == jd.id)
    )
    reqs = result_reqs.scalars().all()
    keywords = [r.skill_name for r in reqs] if reqs else ["Python", "FastAPI"]

    scorer = ATSScorer()
    report_data = await scorer.compute_score(
        resume_text=rv.generated_text,
        jd_text=jd.raw_text,
        jd_keywords=keywords,
    )

    report = ATSReport(
        id=uuid.uuid4(),
        resume_version_id=rv.id,
        user_id=user.id,
        ats_score=report_data["ats_score"],
        keyword_coverage=report_data["keyword_coverage"],
        semantic_match=report_data["semantic_match"],
        readability_score=report_data["readability_score"],
    )
    db.add(report)

    findings = report_data["detailed_findings"]
    for kw in findings["matching_keywords"]:
        db.add(KeywordAnalysis(
            id=uuid.uuid4(), ats_report_id=report.id, user_id=user.id,
            keyword=kw, found=True, frequency=1,
        ))
    for kw in findings["missing_keywords"]:
        db.add(KeywordAnalysis(
            id=uuid.uuid4(), ats_report_id=report.id, user_id=user.id,
            keyword=kw, found=False, frequency=0,
            recommendation=f"Add evidence demonstrating skills in {kw}.",
        ))
    await db.commit()

    return ATSReportResponse(
        ats_score=report_data["ats_score"],
        keyword_coverage=report_data["keyword_coverage"],
        semantic_match=report_data["semantic_match"],
        readability_score=report_data["readability_score"],
        detailed_findings=findings,
    )


@router.post("/optimize", response_model=ATSOptimizeResponse)
async def optimize_resume_ats(
    request: ATSOptimizeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Iteratively rewrites resume content to weave in missing keywords."""
    from apps.api.src.engine.ats_optimizer import ATSOptimizer
    from apps.api.src.engine.docx_engine import DocxEngine

    # Fetch original version using async session
    result_rv = await db.execute(
        select(ResumeVersion).filter(
            ResumeVersion.id == request.resume_version_id,
            ResumeVersion.user_id == user.id,
        )
    )
    prev_version = result_rv.scalars().first()
    if not prev_version:
        raise HTTPException(status_code=404, detail="Original resume version not found.")

    # ATS optimizer requires the async session — refactored to accept AsyncSession
    optimizer = ATSOptimizer(db)
    try:
        res = await optimizer.optimize_resume(
            resume_version_id=request.resume_version_id,
            jd_id=request.jd_id,
            user_id=user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Count existing versions
    from sqlalchemy import func, select as sa_select
    count_res = await db.execute(
        sa_select(func.count(ResumeVersion.id)).filter(
            ResumeVersion.user_id == user.id,
            ResumeVersion.template_id == prev_version.template_id,
        )
    )
    count = count_res.scalar() or 0

    # Export new DOCX
    out_dir = settings.STORAGE_RESUME_DIR
    os.makedirs(out_dir, exist_ok=True)
    out_filename = f"optimized_resume_ats_{uuid.uuid4().hex[:8]}.docx"
    output_path = os.path.join(out_dir, out_filename)

    docx_engine = DocxEngine()
    docx_engine.merge_changes(
        template_path=prev_version.file_path or settings.RESUME_TEMPLATE_PATH,
        optimized_sections={"Professional Experience": res["optimized_text"]},
        output_path=output_path,
    )

    new_version = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=prev_version.template_id,
        version_number=count + 1,
        jd_id=request.jd_id,
        generated_text=res["optimized_text"],
        file_path=output_path,
        evidence_bundle_id=prev_version.evidence_bundle_id,
    )
    db.add(new_version)

    diff_lines = difflib.unified_diff(
        prev_version.generated_text.splitlines(),
        res["optimized_text"].splitlines(),
        fromfile=f"v{prev_version.version_number}",
        tofile=f"v{new_version.version_number}",
        lineterm="",
    )
    db.add(ResumeDiff(
        id=uuid.uuid4(),
        resume_version_id=new_version.id,
        user_id=user.id,
        diff_patch="\n".join(diff_lines),
        modified_sections=["Professional Experience"],
    ))
    await db.commit()

    return ATSOptimizeResponse(
        success=res["success"],
        optimized_resume_id=new_version.id,
        version=new_version.version_number,
        initial_score=res["initial_score"],
        new_score=res["new_score"],
        weaved_keywords=res["weaved_keywords"],
        message=res["message"],
    )
