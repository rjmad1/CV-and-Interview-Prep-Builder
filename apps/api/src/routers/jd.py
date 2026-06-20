"""Job Description router — analyze JD and retrieve evidence."""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.config import settings
from apps.api.src.database import get_db
from apps.api.src.graph.evidence_retrieval import evidence_retrieval_graph
from apps.api.src.graph.jd_intelligence import jd_intelligence_graph
from apps.api.src.models import (
    GapAnalysis,
    GenerationSession,
    JobDescription,
    SkillRequirement,
    User,
)
from apps.api.src.routers.deps import get_current_user
from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api", tags=["Job Descriptions & Evidence"])


class JDAnalysisRequest(BaseModel):
    jd_text: str = Field(..., description="Raw text of the Job Description")


class SkillGap(BaseModel):
    skill: str
    importance: str
    status: str


class JDAnalysisResponse(BaseModel):
    jd_id: uuid.UUID
    extracted_skills: list[str]
    keywords: list[str]
    gap_analysis: list[SkillGap]


class JDListResponse(BaseModel):
    id: uuid.UUID
    company: str
    title: str
    is_archived: bool
    created_at: object


class EvidenceItem(BaseModel):
    chunk_id: uuid.UUID
    confidence: float
    text_snippet: str


class LearningRecommendation(BaseModel):
    title: str
    provider: str
    duration: str
    target: str
    link: str


class LearningRecommendationsResponse(BaseModel):
    recommendations: list[LearningRecommendation]


@router.post("/jd/analyze", response_model=JDAnalysisResponse)
async def analyze_jd(
    request: JDAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Analyzes JD requirements and maps candidate skill gaps."""
    jd_id = uuid.uuid4()

    # Archive existing JDs for this user
    await db.execute(
        update(JobDescription)
        .where(JobDescription.user_id == user.id)
        .values(is_archived=True)
    )
    await db.commit()

    initial_state = {
        "user_id": str(user.id),
        "jd_raw_text": request.jd_text,
        "company": "",
        "title": "",
        "extracted_skills": [],
        "required_keywords": [],
        "experience_gaps": [],
        "score": 0.0,
        "status": "initiated",
        "metadata": {"jd_id": str(jd_id)},
    }

    result = await jd_intelligence_graph.ainvoke(initial_state)

    gap_mappings = [
        SkillGap(skill=g["skill"], importance=g["importance"], status=g["status"])
        for g in result.get("experience_gaps", [])
    ]

    return JDAnalysisResponse(
        jd_id=jd_id,
        extracted_skills=result.get("extracted_skills", []),
        keywords=result.get("required_keywords", []),
        gap_analysis=gap_mappings,
    )


@router.get("/jd", response_model=list[JDListResponse])
async def list_jds(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all analyzed job descriptions."""
    result = await db.execute(
        select(JobDescription)
        .filter(JobDescription.user_id == user.id)
        .order_by(JobDescription.created_at.desc())
    )
    jds = result.scalars().all()
    return [
        JDListResponse(
            id=j.id, company=j.company, title=j.title,
            is_archived=j.is_archived, created_at=j.created_at,
        )
        for j in jds
    ]


@router.get("/jd/{jd_id}", response_model=JDAnalysisResponse)
async def get_jd_analysis(
    jd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieves the structural analysis of a specific Job Description."""
    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == jd_id, JobDescription.user_id == user.id)
    )
    jd = result_jd.scalars().first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")

    result_reqs = await db.execute(
        select(SkillRequirement).filter(SkillRequirement.jd_id == jd_id)
    )
    reqs = result_reqs.scalars().all()

    result_gaps = await db.execute(
        select(GapAnalysis).filter(GapAnalysis.jd_id == jd_id, GapAnalysis.user_id == user.id)
    )
    gaps = result_gaps.scalars().all()

    return JDAnalysisResponse(
        jd_id=jd.id,
        extracted_skills=[r.skill_name for r in reqs],
        keywords=[g.skill_name for g in gaps if g.importance == "high"],
        gap_analysis=[
            SkillGap(
                skill=g.skill_name,
                importance=g.importance,
                status=g.match_status.capitalize(),
            )
            for g in gaps
        ],
    )


@router.get("/evidence/retrieve", response_model=list[EvidenceItem])
async def retrieve_evidence(
    jd_id: uuid.UUID = Query(..., description="UUID of the analyzed Job Description"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieves relevant evidence chunks matching a job description via hybrid retrieval."""
    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == jd_id, JobDescription.user_id == user.id)
    )
    jd = result_jd.scalars().first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")

    result_reqs = await db.execute(
        select(SkillRequirement).filter(SkillRequirement.jd_id == jd.id)
    )
    reqs = result_reqs.scalars().all()
    req_names = [r.skill_name for r in reqs] if reqs else ["Python", "FastAPI"]

    session_id = uuid.uuid4()
    sess = GenerationSession(id=session_id, user_id=user.id, session_type="evidence_retrieval")
    db.add(sess)
    await db.commit()

    retrieval_state = {
        "user_id": str(user.id),
        "session_id": str(session_id),
        "jd_requirements": req_names,
        "sparse_results": [],
        "dense_results": [],
        "merged_results": [],
        "reranked_results": [],
        "evidence_bundle": {},
        "status": "initiated",
    }

    retrieval_res = await evidence_retrieval_graph.ainvoke(retrieval_state)
    bundle = retrieval_res.get("evidence_bundle", {"bundle_id": str(uuid.uuid4()), "items": []})

    evidence_items = []
    for item in bundle.get("items", []):
        try:
            evidence_items.append(
                EvidenceItem(
                    chunk_id=uuid.UUID(item["chunk_id"]),
                    confidence=item["confidence"],
                    text_snippet=item["text_snippet"],
                )
            )
        except Exception as exc:
            logger.error(f"Error parsing evidence item: {exc}")

    return evidence_items


@router.get("/jd/{jd_id}/learning", response_model=LearningRecommendationsResponse)
async def get_learning_recommendations(
    jd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generates dynamic AI learning recommendations based on identified skill gaps."""
    import json

    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == jd_id, JobDescription.user_id == user.id)
    )
    jd = result_jd.scalars().first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")

    result_gaps = await db.execute(
        select(GapAnalysis).filter(GapAnalysis.jd_id == jd_id, GapAnalysis.user_id == user.id)
    )
    gaps = result_gaps.scalars().all()

    missing_skills = [g.skill_name for g in gaps if g.match_status in ("missing", "underrepresented")]
    if not missing_skills:
        missing_skills = [g.skill_name for g in gaps]

    if not missing_skills:
        # Fallback default recommendations if no gaps are loaded yet
        return LearningRecommendationsResponse(recommendations=[
            LearningRecommendation(
                title="Advanced FastAPI Masterclass",
                provider="FastAPI Core / Udemy",
                duration="8 hours",
                target="Bridges Python Backend Gap",
                link="#",
            ),
            LearningRecommendation(
                title="PostgreSQL Query Optimization & RLS",
                provider="Postgres Institute / Coursera",
                duration="12 hours",
                target="Bridges Database Security Gap",
                link="#",
            ),
            LearningRecommendation(
                title="NVIDIA NIM Integration & LLM Guardrails",
                provider="NVIDIA Deep Learning Institute",
                duration="6 hours",
                target="Bridges AI Gateway Integration Gap",
                link="#",
            )
        ])

    system_prompt = (
        "You are an expert technical career development coach. "
        "Based on the provided list of technical skill gaps and the target job title, "
        "generate exactly 3 highly relevant and specific learning recommendations (courses, books, or documentation paths) "
        "to help the candidate bridge these specific gaps.\n"
        "Output a valid JSON object matching this schema:\n"
        '{"recommendations": [{"title": "Course Title", "provider": "Provider Name", "duration": "X hours", "target": "Bridges [Skill] Gap", "link": "#"}]}'
    )

    user_prompt = (
        f"Target Job Position: {jd.title} at {jd.company}\n"
        f"Identified Skill Gaps:\n" + "\n".join(f"- {s}" for s in missing_skills)
    )

    try:
        raw = await ai_gateway_client.generate(
            model=settings.MODEL_INTERVIEW_COACH,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )
        clean = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)
        return LearningRecommendationsResponse(**data)
    except Exception as exc:
        logger.error(f"Failed to generate dynamic learning recommendations: {exc}")
        # Structured fallback recommendations
        recommendations = []
        for gap in missing_skills[:3]:
            recommendations.append(
                LearningRecommendation(
                    title=f"{gap} Essentials & Production Best Practices",
                    provider="Enterprise Learning Hub",
                    duration="10 hours",
                    target=f"Bridges {gap} Gap",
                    link="#",
                )
            )
        while len(recommendations) < 3:
            recommendations.append(
                LearningRecommendation(
                    title="System Design & Architecture Upgrades",
                    provider="O'Reilly Media",
                    duration="15 hours",
                    target="Bridges System Design Gap",
                    link="#",
                )
            )
        return LearningRecommendationsResponse(recommendations=recommendations)
