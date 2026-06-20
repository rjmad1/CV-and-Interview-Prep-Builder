"""Evidence validation and hallucination audit router."""
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.database import get_db
from apps.api.src.models import DocumentChunk, HallucinationEvent, User
from apps.api.src.routers.deps import get_current_user
from apps.api.src.utils.ai_client import ai_gateway_client
from apps.api.src.utils.similarity import cosine_similarity, jaccard_similarity

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api/evidence", tags=["Evidence & Validation"])


class HallucinationEventResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    generated_snippet: str
    validation_status: str
    audit_comments: str | None
    created_at: Any


class VerifyClaimRequest(BaseModel):
    text_snippet: str
    selected_evidence_ids: list[uuid.UUID]


class VerifyClaimResponse(BaseModel):
    passed: bool
    similarity_score: float
    matched_chunk_id: uuid.UUID | None
    matched_chunk_text: str | None


class OverrideClaimRequest(BaseModel):
    event_id: uuid.UUID
    audit_comments: str


@router.get("/hallucinations", response_model=list[HallucinationEventResponse])
async def list_hallucinations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all logged validation failures / hallucination blocks."""
    result = await db.execute(
        select(HallucinationEvent)
        .filter(HallucinationEvent.user_id == user.id)
        .order_by(HallucinationEvent.created_at.desc())
    )
    return [
        HallucinationEventResponse(
            id=ev.id, session_id=ev.session_id, generated_snippet=ev.generated_snippet,
            validation_status=ev.validation_status, audit_comments=ev.audit_comments,
            created_at=ev.created_at,
        )
        for ev in result.scalars().all()
    ]


@router.post("/verify", response_model=VerifyClaimResponse)
async def verify_claim(
    request: VerifyClaimRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Calculates cosine similarity between a claim and selected evidence chunks."""
    if not request.selected_evidence_ids:
        raise HTTPException(status_code=400, detail="Must select at least one evidence chunk.")

    result = await db.execute(
        select(DocumentChunk).filter(
            DocumentChunk.id.in_(request.selected_evidence_ids),
            DocumentChunk.user_id == user.id,
        )
    )
    chunks = result.scalars().all()
    if not chunks:
        raise HTTPException(status_code=404, detail="Selected evidence chunks not found.")

    evidence_texts = [c.chunk_text for c in chunks]

    try:
        embeddings = await ai_gateway_client.embed([request.text_snippet] + evidence_texts)
        snippet_vec = embeddings[0]

        max_sim = 0.0
        matched_chunk = None
        for idx, ev_vec in enumerate(embeddings[1:]):
            sim = cosine_similarity(snippet_vec, ev_vec)
            if sim > max_sim:
                max_sim = sim
                matched_chunk = chunks[idx]

        return VerifyClaimResponse(
            passed=max_sim >= 0.8,
            similarity_score=round(max_sim, 4),
            matched_chunk_id=matched_chunk.id if matched_chunk else None,
            matched_chunk_text=matched_chunk.chunk_text if matched_chunk else None,
        )
    except Exception as exc:
        logger.error(f"Semantic claim verification failed, falling back to Jaccard: {exc}")
        max_sim = 0.0
        matched_chunk = None
        for chunk in chunks:
            sim = jaccard_similarity(request.text_snippet, chunk.chunk_text)
            if sim > max_sim:
                max_sim = sim
                matched_chunk = chunk
        return VerifyClaimResponse(
            passed=max_sim >= 0.5,
            similarity_score=round(max_sim, 4),
            matched_chunk_id=matched_chunk.id if matched_chunk else None,
            matched_chunk_text=matched_chunk.chunk_text if matched_chunk else None,
        )


@router.post("/override")
async def override_hallucination(
    request: OverrideClaimRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Allows user to override a hallucination block with audit justification."""
    result = await db.execute(
        select(HallucinationEvent).filter(
            HallucinationEvent.id == request.event_id,
            HallucinationEvent.user_id == user.id,
        )
    )
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Hallucination event not found.")

    event.validation_status = "overridden"
    event.audit_comments = f"User Override: {request.audit_comments}"
    await db.commit()
    return {"status": "success", "message": "Hallucination block overridden successfully."}
