"""Developer request and task orchestration router."""
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from apps.api.src.database import get_db
from apps.api.src.models import DeveloperRequest, DeveloperTask, User
from apps.api.src.routers.deps import get_current_user
from apps.api.src.utils.orchestration_agent import OrchestrationAgent

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api/orchestration", tags=["Orchestration"])


# --- Schemas ---

class DeveloperRequestCreate(BaseModel):
    title: str
    description: str
    request_type: str  # feature | bug | ux | tech_debt | performance | security
    url: str | None = None
    screen_name: str | None = None
    component_name: str | None = None
    meta_data: dict[str, Any] = {}


class DeveloperTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    affected_layer: str
    file_path: str | None
    status: str


class DeveloperRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    request_type: str
    title: str
    description: str
    url: str | None
    screen_name: str | None
    component_name: str | None
    status: str
    priority: str
    impact_assessment: str | None
    effort_estimate: str | None
    created_at: Any
    tasks: list[DeveloperTaskResponse] = []


# --- Routes ---

@router.post("/requests", response_model=DeveloperRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_developer_request(
    payload: DeveloperRequestCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Submits a developer feedback request, triggers AI triage analysis, and saves tasks."""
    agent = OrchestrationAgent()
    analysis = await agent.analyze_request(
        title=payload.title,
        description=payload.description,
        request_type=payload.request_type,
        url=payload.url,
        screen_name=payload.screen_name,
    )

    request_id = uuid.uuid4()
    dev_request = DeveloperRequest(
        id=request_id,
        user_id=user.id,
        request_type=analysis.get("request_type", payload.request_type),
        title=payload.title,
        description=payload.description,
        url=payload.url,
        screen_name=payload.screen_name,
        component_name=payload.component_name,
        meta_data=payload.meta_data,
        status="analyzed",
        priority=analysis.get("priority", "medium"),
        impact_assessment=analysis.get("impact_assessment"),
        effort_estimate=analysis.get("effort_estimate"),
    )
    db.add(dev_request)
    await db.commit()

    tasks = []
    for t in analysis.get("tasks", []):
        task_obj = DeveloperTask(
            id=uuid.uuid4(),
            request_id=request_id,
            title=t.get("title"),
            description=t.get("description"),
            affected_layer=t.get("affected_layer"),
            file_path=t.get("file_path"),
            status="todo",
        )
        db.add(task_obj)
        tasks.append(task_obj)
    await db.commit()

    return DeveloperRequestResponse(
        id=dev_request.id,
        request_type=dev_request.request_type,
        title=dev_request.title,
        description=dev_request.description,
        url=dev_request.url,
        screen_name=dev_request.screen_name,
        component_name=dev_request.component_name,
        status=dev_request.status,
        priority=dev_request.priority,
        impact_assessment=dev_request.impact_assessment,
        effort_estimate=dev_request.effort_estimate,
        created_at=dev_request.created_at,
        tasks=[DeveloperTaskResponse.model_validate(t) for t in tasks],
    )


@router.get("/requests", response_model=list[DeveloperRequestResponse])
async def list_developer_requests(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all developer requests with their tasks — uses selectinload (no N+1)."""
    result = await db.execute(
        select(DeveloperRequest)
        .options(selectinload(DeveloperRequest.tasks))
        .filter(DeveloperRequest.user_id == user.id)
        .order_by(DeveloperRequest.created_at.desc())
    )
    reqs = result.scalars().all()
    return [
        DeveloperRequestResponse(
            id=r.id, request_type=r.request_type, title=r.title,
            description=r.description, url=r.url, screen_name=r.screen_name,
            component_name=r.component_name, status=r.status, priority=r.priority,
            impact_assessment=r.impact_assessment, effort_estimate=r.effort_estimate,
            created_at=r.created_at,
            tasks=[DeveloperTaskResponse.model_validate(t) for t in r.tasks],
        )
        for r in reqs
    ]


@router.get("/tasks", response_model=list[DeveloperTaskResponse])
async def list_developer_tasks(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all developer tasks across all requests."""
    result = await db.execute(
        select(DeveloperTask)
        .join(DeveloperRequest)
        .filter(DeveloperRequest.user_id == user.id)
    )
    return [DeveloperTaskResponse.model_validate(t) for t in result.scalars().all()]
