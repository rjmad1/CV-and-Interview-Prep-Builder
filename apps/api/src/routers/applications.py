"""Applications, interviews, and outcomes tracking router."""
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.database import get_db
from apps.api.src.models import Application, Interview, JobDescription, Outcome, ResumeVersion, User
from apps.api.src.routers.deps import get_current_user

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api/applications", tags=["Applications"])


# --- Schemas ---

class ApplicationCreateRequest(BaseModel):
    jd_id: uuid.UUID
    resume_version_id: uuid.UUID
    notes: str | None = None


class ApplicationUpdateRequest(BaseModel):
    status: str
    notes: str | None = None


class InterviewCreateRequest(BaseModel):
    scheduled_at: str  # ISO 8601
    round_number: int = 1
    interviewer_info: str | None = None


class OutcomeCreateRequest(BaseModel):
    outcome_type: str  # offer | rejection | withdraw
    feedback: str | None = None
    details: Dict[str, Any] = {}


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    jd_id: uuid.UUID
    resume_version_id: uuid.UUID
    status: str
    notes: str | None
    company: str
    title: str
    created_at: Any


class InterviewScheduleResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    scheduled_at: Any
    round_number: int
    interviewer_info: str | None
    status: str


# --- Routes ---

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all job applications with their JD details (single JOIN, no N+1)."""
    result = await db.execute(
        select(Application, JobDescription)
        .join(JobDescription, Application.jd_id == JobDescription.id)
        .filter(Application.user_id == user.id)
    )
    return [
        ApplicationResponse(
            id=app_rec.id, jd_id=app_rec.jd_id, resume_version_id=app_rec.resume_version_id,
            status=app_rec.status, notes=app_rec.notes,
            company=jd_rec.company, title=jd_rec.title, created_at=app_rec.created_at,
        )
        for app_rec, jd_rec in result.all()
    ]


@router.post("", response_model=ApplicationResponse)
async def create_application(
    request: ApplicationCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Creates a new job application tracking entry."""
    result_jd = await db.execute(
        select(JobDescription).filter(JobDescription.id == request.jd_id, JobDescription.user_id == user.id)
    )
    jd = result_jd.scalars().first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found.")

    result_rv = await db.execute(
        select(ResumeVersion).filter(ResumeVersion.id == request.resume_version_id, ResumeVersion.user_id == user.id)
    )
    rv = result_rv.scalars().first()
    if not rv:
        raise HTTPException(status_code=404, detail="Resume version not found.")

    app_rec = Application(
        id=uuid.uuid4(), user_id=user.id, jd_id=request.jd_id,
        resume_version_id=request.resume_version_id, status="applied", notes=request.notes,
    )
    db.add(app_rec)
    await db.commit()

    return ApplicationResponse(
        id=app_rec.id, jd_id=app_rec.jd_id, resume_version_id=app_rec.resume_version_id,
        status=app_rec.status, notes=app_rec.notes,
        company=jd.company, title=jd.title, created_at=app_rec.created_at,
    )


@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: uuid.UUID,
    request: ApplicationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Updates application status or notes."""
    result = await db.execute(
        select(Application, JobDescription)
        .join(JobDescription, Application.jd_id == JobDescription.id)
        .filter(Application.id == app_id, Application.user_id == user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found.")
    app_rec, jd = row

    app_rec.status = request.status
    if request.notes is not None:
        app_rec.notes = request.notes
    await db.commit()

    return ApplicationResponse(
        id=app_rec.id, jd_id=app_rec.jd_id, resume_version_id=app_rec.resume_version_id,
        status=app_rec.status, notes=app_rec.notes,
        company=jd.company, title=jd.title, created_at=app_rec.created_at,
    )


@router.delete("/{app_id}")
async def delete_application(
    app_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Deletes a job application entry."""
    result = await db.execute(
        select(Application).filter(Application.id == app_id, Application.user_id == user.id)
    )
    app_rec = result.scalars().first()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found.")
    await db.delete(app_rec)
    await db.commit()
    return {"status": "success", "message": "Application deleted successfully."}


@router.get("/{app_id}/interviews", response_model=List[InterviewScheduleResponse])
async def list_interviews(
    app_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all scheduled interview rounds for an application."""
    result = await db.execute(
        select(Interview).filter(Interview.application_id == app_id, Interview.user_id == user.id)
    )
    return [
        InterviewScheduleResponse(
            id=i.id, application_id=i.application_id, scheduled_at=i.scheduled_at,
            round_number=i.round_number, interviewer_info=i.interviewer_info, status=i.status,
        )
        for i in result.scalars().all()
    ]


@router.post("/{app_id}/interviews", response_model=InterviewScheduleResponse)
async def create_interview(
    app_id: uuid.UUID,
    request: InterviewCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Schedules a new interview round and transitions the application to 'interviewing'."""
    result = await db.execute(
        select(Application).filter(Application.id == app_id, Application.user_id == user.id)
    )
    app_rec = result.scalars().first()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found.")

    try:
        scheduled_dt = datetime.fromisoformat(request.scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601 (e.g. 2026-06-20T10:00:00).")

    interview = Interview(
        id=uuid.uuid4(), application_id=app_id, user_id=user.id,
        scheduled_at=scheduled_dt, round_number=request.round_number,
        interviewer_info=request.interviewer_info, status="scheduled",
    )
    db.add(interview)
    app_rec.status = "interviewing"
    await db.commit()

    return InterviewScheduleResponse(
        id=interview.id, application_id=interview.application_id,
        scheduled_at=interview.scheduled_at, round_number=interview.round_number,
        interviewer_info=interview.interviewer_info, status=interview.status,
    )


@router.post("/{app_id}/outcome")
async def log_outcome(
    app_id: uuid.UUID,
    request: OutcomeCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Logs the final application outcome and updates status."""
    result = await db.execute(
        select(Application).filter(Application.id == app_id, Application.user_id == user.id)
    )
    app_rec = result.scalars().first()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found.")

    db.add(Outcome(
        id=uuid.uuid4(), application_id=app_id, user_id=user.id,
        outcome_type=request.outcome_type, feedback=request.feedback, details=request.details,
    ))

    if request.outcome_type == "offer":
        app_rec.status = "offered"
    elif request.outcome_type in ("rejection", "withdraw"):
        app_rec.status = "rejected"

    await db.commit()
    return {"status": "success", "message": f"Outcome logged. Application status: {app_rec.status}."}
