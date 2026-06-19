"""Settings and application lifecycle router."""
import logging
import os
import shutil
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.config import settings
from apps.api.src.database import get_db
from apps.api.src.models import (
    Achievement, Application, ATSReport, Certification, CoverLetterVersion,
    DeveloperRequest, DeveloperTask, Document, DocumentChunk, Education, Experience,
    EvidenceBundle, GapAnalysis, GenerationSession, HallucinationEvent, Interview,
    InterviewSessionState, JobDescription, KeywordAnalysis, Outcome, ResumeDiff,
    ResumeTemplate, ResumeVersion, Skill, SkillRequirement, TraceRecord, User,
)
from apps.api.src.routers.deps import get_current_user
from apps.api.src.utils.ai_client import nvidia_api_key_ctx, ai_gateway_mode_ctx

logger = logging.getLogger("cis-api")
router = APIRouter(tags=["Settings & Lifecycle"])


class SettingsSaveRequest(BaseModel):
    nvidia_api_key: str | None = None
    ai_gateway_mode: str | None = None


class SettingsStatusResponse(BaseModel):
    api_key_configured: bool
    ai_gateway_mode: str


@router.get("/api/settings/status", response_model=SettingsStatusResponse)
async def get_settings_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Returns current AI gateway configuration status."""
    api_key_configured = bool(settings.NVIDIA_API_KEY)
    return SettingsStatusResponse(
        api_key_configured=api_key_configured,
        ai_gateway_mode=settings.AI_GATEWAY_MODE,
    )


@router.post("/api/settings/save")
async def save_settings(
    request: SettingsSaveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Updates AI gateway settings in the running process environment."""
    if request.ai_gateway_mode is not None:
        settings.AI_GATEWAY_MODE = request.ai_gateway_mode
        os.environ["AI_GATEWAY_MODE"] = request.ai_gateway_mode
    if request.nvidia_api_key is not None:
        settings.NVIDIA_API_KEY = request.nvidia_api_key
        os.environ["NVIDIA_API_KEY"] = request.nvidia_api_key
    return {"status": "success", "message": "Settings updated in running process."}


@router.post("/api/cleanup/reset")
async def reset_database(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Resets the application to a clean baseline state."""
    # 1. Clear storage directories
    for path in [settings.STORAGE_UPLOAD_DIR, settings.STORAGE_RESUME_DIR, settings.STORAGE_COVER_LETTER_DIR]:
        if os.path.exists(path):
            try:
                for item in os.listdir(path):
                    item_path = os.path.join(path, item)
                    if os.path.isfile(item_path) or os.path.islink(item_path):
                        os.unlink(item_path)
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                logger.info(f"Cleared directory: {path}")
            except Exception as exc:
                logger.error(f"Failed to clear directory {path}: {exc}")

    # 2. Clear Qdrant collection
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.http.models import Distance, PayloadSchemaType, VectorParams
        qclient = QdrantClient(url=settings.QDRANT_URL)
        existing = [c.name for c in qclient.get_collections().collections]
        if "career_chunks" in existing:
            qclient.delete_collection("career_chunks")
            qclient.create_collection(
                collection_name="career_chunks",
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
            )
            qclient.create_payload_index(
                collection_name="career_chunks",
                field_name="user_id",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            logger.info("Cleared and recreated Qdrant collection: career_chunks")
    except Exception as exc:
        logger.warning(f"Failed to reset Qdrant collection: {exc}")

    # 3. Truncate all tables (FK dependency order)
    tables_to_clear = [
        Outcome, Interview, InterviewSessionState, Application, KeywordAnalysis,
        ATSReport, ResumeDiff, ResumeVersion, ResumeTemplate, HallucinationEvent,
        TraceRecord, EvidenceBundle, GenerationSession, GapAnalysis, SkillRequirement,
        JobDescription, Achievement, Education, Certification, Experience, Skill,
        DocumentChunk, Document, CoverLetterVersion, DeveloperTask, DeveloperRequest, User,
    ]
    for table in tables_to_clear:
        try:
            await db.execute(text(f"DELETE FROM {table.__tablename__}"))
        except Exception as exc:
            logger.error(f"Failed to clear table {table.__tablename__}: {exc}")

    await db.commit()

    # 4. Recreate developer user and default template
    dev_user = User(
        id=uuid.uuid4(),
        email="developer@career-intelligence.studio",
        hashed_password="pbkdf2:sha256:dev-only-not-a-real-hash",
        first_name="Lead",
        last_name="Architect",
        role="admin",
    )
    db.add(dev_user)
    await db.commit()
    await db.refresh(dev_user)

    db.add(ResumeTemplate(
        id=uuid.uuid4(),
        user_id=dev_user.id,
        name="Professional Default Template",
        file_path=settings.RESUME_TEMPLATE_PATH,
        is_active=True,
    ))
    await db.commit()

    return {"status": "success", "message": "Application reset to clean baseline state."}
