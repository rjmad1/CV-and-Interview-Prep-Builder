"""Interview router — mock sessions, coaching, reports, and prep cards."""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from apps.api.src.config import settings
from apps.api.src.database import get_db
from apps.api.src.graph.evidence_retrieval import evidence_retrieval_graph
from apps.api.src.graph.interview_prep import interview_prep_graph
from apps.api.src.models import (
    DocumentChunk,
    GenerationSession,
    InterviewSessionState,
    JobDescription,
    ResumeVersion,
    SkillRequirement,
    TraceRecord,
    User,
)
from apps.api.src.routers.deps import get_current_user
from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api/interview", tags=["Interview"])


# --- Schemas ---

class InterviewStartRequest(BaseModel):
    resume_id: uuid.UUID
    jd_id: uuid.UUID


class InterviewSessionResponse(BaseModel):
    session_id: uuid.UUID
    question: str
    question_number: int


class InterviewRespondRequest(BaseModel):
    session_id: uuid.UUID
    user_response: str


class InterviewFeedbackResponse(BaseModel):
    session_id: uuid.UUID
    coaching_tips: str
    next_question: str | None
    completed: bool


class InterviewReportResponse(BaseModel):
    session_id: uuid.UUID
    readiness_score: float
    key_strengths: list[str]
    improvement_areas: list[str]
    transcript: list[dict[str, str]]


class STARStory(BaseModel):
    situation: str
    task: str
    action: str
    result: str


class TechnicalFlashcard(BaseModel):
    question: str
    answer: str


class PrepCardResponse(BaseModel):
    star_stories: list[STARStory]
    technical_flashcards: list[TechnicalFlashcard]
    behavioral_tips: list[str]


# --- Helpers ---

async def _load_evidence_for_version(db: AsyncSession, rv: ResumeVersion) -> list:
    """Loads evidence text snippets via a single IN query instead of per-trace loops."""
    if not rv.evidence_bundle_id:
        return []
    result_traces = await db.execute(
        select(TraceRecord).filter(TraceRecord.bundle_id == rv.evidence_bundle_id)
    )
    traces = result_traces.scalars().all()
    chunk_ids = [t.chunk_id for t in traces]
    if not chunk_ids:
        return []
    result_chunks = await db.execute(
        select(DocumentChunk).filter(DocumentChunk.id.in_(chunk_ids))
    )
    chunks = result_chunks.scalars().all()
    return [{"chunk_id": str(c.id), "text_snippet": c.chunk_text} for c in chunks]


# --- Routes ---

@router.post("/start", response_model=InterviewSessionResponse)
async def start_interview(
    request: InterviewStartRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Starts a mock interview session grounded in resume and JD."""
    result_rv = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == request.resume_id)
    )
    rv = result_rv.scalars().first()
    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == request.jd_id)
    )
    jd = result_jd.scalars().first()
    if not rv or not jd:
        raise HTTPException(status_code=404, detail="Resume version or Job Description not found.")

    # Fixed N+1: single IN query for evidence
    evidence_items = await _load_evidence_for_version(db, rv)

    res = await interview_prep_graph.ainvoke({
        "resume_text": rv.generated_text,
        "jd_text": jd.raw_text,
        "evidence_bundle": {"items": evidence_items},
        "generated_questions": [],
        "active_question_index": 0,
        "user_responses": [],
        "coaching_feedback": [],
        "readiness_score": 0.0,
        "status": "initiated",
    })

    session_id = uuid.uuid4()
    db.add(GenerationSession(id=session_id, user_id=user.id, session_type="interview_prep"))
    db.add(InterviewSessionState(id=session_id, user_id=user.id, session_data=res))
    await db.commit()

    first_q = res.get("generated_questions", [{"text": "Tell me about yourself."}])[0]["text"]
    return InterviewSessionResponse(session_id=session_id, question=first_q, question_number=1)


@router.post("/respond", response_model=InterviewFeedbackResponse)
async def respond_to_question(
    request: InterviewRespondRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Records user response and returns coaching tips + next question."""
    result = await db.execute(
        select(InterviewSessionState).filter(
            InterviewSessionState.id == request.session_id,
            InterviewSessionState.user_id == user.id,
        )
    )
    session_state = result.scalars().first()
    if not session_state:
        raise HTTPException(status_code=404, detail="Interview session not found or expired.")

    state = session_state.session_data
    active_idx = state.get("active_question_index", 0)
    questions = state.get("generated_questions", [])

    responses = state.get("user_responses", [])
    responses.append(request.user_response)
    state["user_responses"] = responses

    res = await interview_prep_graph.ainvoke(state)
    state["coaching_feedback"] = res.get("coaching_feedback", [])
    state["status"] = res.get("status", "")

    coaching_tips = (res.get("coaching_feedback") or ["Good job."])[-1]
    next_idx = active_idx + 1
    completed = next_idx >= len(questions)
    next_q = None

    if not completed:
        state["active_question_index"] = next_idx
        next_q = questions[next_idx]["text"]
    else:
        state["active_question_index"] = next_idx
        final_res = await interview_prep_graph.ainvoke(state)
        state["readiness_score"] = final_res.get("readiness_score", 85.0)
        state["status"] = final_res.get("status", "completed")

    session_state.session_data = state
    flag_modified(session_state, "session_data")
    await db.commit()

    return InterviewFeedbackResponse(
        session_id=request.session_id,
        coaching_tips=coaching_tips,
        next_question=next_q,
        completed=completed,
    )


@router.get("/report", response_model=InterviewReportResponse)
async def get_interview_report(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Returns the final interview readiness report."""
    result = await db.execute(
        select(InterviewSessionState).filter(
            InterviewSessionState.id == session_id,
            InterviewSessionState.user_id == user.id,
        )
    )
    session_state = result.scalars().first()
    if not session_state:
        raise HTTPException(status_code=404, detail="Interview session report not found.")

    state = session_state.session_data
    score = state.get("readiness_score", 85.0)
    questions = state.get("generated_questions", [])
    responses = state.get("user_responses", [])
    feedbacks = state.get("coaching_feedback", [])

    transcript = []
    for idx, (q, r) in enumerate(zip(questions, responses, strict=False)):
        transcript.append({"speaker": "Interviewer", "text": q["text"]})
        transcript.append({"speaker": "Candidate", "text": r})
        if idx < len(feedbacks):
            transcript.append({"speaker": "Coach Tips", "text": feedbacks[idx]})

    return InterviewReportResponse(
        session_id=session_id,
        readiness_score=score,
        key_strengths=[
            "Strong technical detail and architecture representation.",
            "Appropriate alignment of evidence-based project facts.",
        ],
        improvement_areas=[
            "Focus on quantifying metrics (e.g. throughput gains, latency percentages).",
            "Keep paragraphs concise to enhance speaking flow.",
        ],
        transcript=transcript,
    )


@router.get("/assistant/prep", response_model=PrepCardResponse)
async def get_prep_cards(
    jd_id: uuid.UUID,
    resume_version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generates structured interview prep cards (STAR stories, flashcards, behavioral tips)."""
    import json

    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == jd_id, JobDescription.user_id == user.id)
    )
    jd = result_jd.scalars().first()
    result_resume = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == resume_version_id, ResumeVersion.user_id == user.id)
    )
    resume = result_resume.scalars().first()
    if not jd or not resume:
        raise HTTPException(status_code=404, detail="Job description or resume version not found.")

    # Fixed N+1: single IN query for evidence texts
    evidence_texts = []
    if resume.evidence_bundle_id:
        evidence_items = await _load_evidence_for_version(db, resume)
        evidence_texts = [item["text_snippet"] for item in evidence_items]

    if not evidence_texts:
        result_reqs = await db.execute(
            select(SkillRequirement).filter(SkillRequirement.jd_id == jd.id)
        )
        reqs = result_reqs.scalars().all()
        req_names = [r.skill_name for r in reqs] if reqs else ["Python", "FastAPI"]
        session_id = uuid.uuid4()
        retrieval_res = await evidence_retrieval_graph.ainvoke({
            "user_id": str(user.id),
            "session_id": str(session_id),
            "jd_requirements": req_names,
            "sparse_results": [], "dense_results": [],
            "merged_results": [], "reranked_results": [],
            "evidence_bundle": {}, "status": "initiated",
        })
        bundle = retrieval_res.get("evidence_bundle", {"items": []})
        evidence_texts = [item["text_snippet"] for item in bundle.get("items", [])]

    if not evidence_texts:
        evidence_texts = ["Experienced engineer implementing Python backend APIs using FastAPI."]

    system_prompt = (
        "You are an elite interview preparation coach. Generate a structured interview prep package.\n"
        "Output exactly 2 STAR stories, exactly 3 technical flashcards, and exactly 3 behavioral tips.\n"
        'Output a valid JSON object: {"star_stories": [{"situation":"...","task":"...","action":"...","result":"..."}],'
        '"technical_flashcards": [{"question":"...","answer":"..."}], "behavioral_tips": ["..."]}'
    )
    user_prompt = (
        f"Target Job Description:\n{jd.raw_text}\n\n"
        f"Candidate Resume:\n{resume.generated_text}\n\n"
        f"Verified Evidence:\n" + "\n".join(f"- {t}" for t in evidence_texts)
    )

    try:
        raw = await ai_gateway_client.generate(
            model=settings.MODEL_INTERVIEW_COACH,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.4,
        )
        prep_data = json.loads(raw.replace("```json", "").replace("```", "").strip())
    except Exception as exc:
        logger.error(f"Failed to generate/parse prep cards: {exc}")
        prep_data = {
            "star_stories": [{
                "situation": f"Preparing for {jd.title} at {jd.company}.",
                "task": "Synthesize verified resume milestones into concise architectural responses.",
                "action": "Built REST endpoints and integrated database-backed models.",
                "result": "Completed mock coaching verification flow with low-latency responsiveness.",
            }],
            "technical_flashcards": [{
                "question": "Explain how Zustand connects with Next.js in local state management.",
                "answer": "Zustand stores expose hooks consumed directly in Next.js functional components.",
            }],
            "behavioral_tips": [
                "Structure STAR stories to focus heavily on the measurable impact (the R).",
                "Review grounding audit results to ensure technical details match source documents.",
                "Be ready to elaborate on database indexing when describing backend achievements.",
            ],
        }

    return PrepCardResponse(**prep_data)
