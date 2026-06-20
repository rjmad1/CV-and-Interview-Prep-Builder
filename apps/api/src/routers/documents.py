"""Documents router — scan, list, get document endpoints."""
import logging
import os
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.config import settings
from apps.api.src.database import get_db
from apps.api.src.models import Document, User
from apps.api.src.routers.deps import get_current_user
from apps.api.src.utils.encryption import write_vault_file
from apps.api.src.workers.tasks import process_document_task

logger = logging.getLogger("cis-api")
router = APIRouter(prefix="/api/documents", tags=["Documents"])

_ALLOWED_DOCUMENT_TYPES = frozenset({
    "resume", "certification", "portfolio", "recommendation_letter", "profile", "other"
})


class DocumentScanResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    status: str
    metadata: dict[str, Any]


class DocumentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    document_type: str
    parsed_text: str | None
    is_archived: bool
    metadata: dict[str, Any]


@router.post("/scan", response_model=DocumentScanResponse, status_code=status.HTTP_202_ACCEPTED)
async def scan_document(
    file: UploadFile = File(...),
    document_type: str = Query(
        "resume",
        description="Document type: resume, certification, portfolio, recommendation_letter, profile, other",
    ),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Scans and initiates background document ingestion, parsing, and vector indexing."""
    if document_type not in _ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document_type '{document_type}'. Must be one of: {sorted(_ALLOWED_DOCUMENT_TYPES)}",
        )

    document_id = uuid.uuid4()
    upload_dir = settings.STORAGE_UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{document_id.hex}_{file.filename}")

    contents = await file.read()
    write_vault_file(file_path, contents, encrypt=settings.STORAGE_ENCRYPTION_ACTIVE)

    # Enforce 1-active-resume policy
    if document_type == "resume":
        await db.execute(
            update(Document)
            .where(Document.user_id == user.id, Document.document_type == "resume")
            .values(is_archived=True)
        )
        await db.commit()

    doc = Document(
        id=document_id,
        user_id=user.id,
        filename=file.filename,
        file_path=file_path,
        mime_type=file.content_type or "application/octet-stream",
        document_type=document_type,
        parsed_text="",
        is_archived=False,
        meta_data={"status": "processing"},
    )
    db.add(doc)
    await db.commit()

    use_celery = os.getenv("CELERY_WORKER_RUNNING", "false").lower() == "true"
    if use_celery:
        process_document_task.delay(str(document_id), str(user.id), file_path)
    else:
        logger.info("No Celery worker configured — processing document inline.")
        try:
            from apps.api.src.graph.document_processing import document_processing_graph
            initial_state = {
                "file_path": file_path,
                "file_content": None,
                "parsed_text": "",
                "document_type": document_type,
                "chunks": [],
                "embeddings": [],
                "status": "initiated",
                "metadata": {"document_id": str(document_id), "user_id": str(user.id)},
            }
            result = await document_processing_graph.ainvoke(initial_state)
            logger.info(f"Inline document processing status: {result.get('status')}")
        except Exception as err:
            logger.error(f"Inline document processing failed: {err}", exc_info=True)

    return DocumentScanResponse(
        document_id=document_id,
        filename=file.filename,
        status="processing",
        metadata={"size_bytes": len(contents), "mime_type": file.content_type},
    )


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lists all parsed documents in the tenant's Career Archive."""
    result = await db.execute(select(Document).filter(Document.user_id == user.id))
    docs = result.scalars().all()
    return [
        DocumentResponse(
            id=d.id,
            filename=d.filename,
            document_type=d.document_type,
            parsed_text=d.parsed_text,
            is_archived=d.is_archived,
            metadata=d.meta_data,
        )
        for d in docs
    ]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieves metadata and parsed contents of a specific document."""
    result = await db.execute(
        select(Document).filter(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        document_type=doc.document_type,
        parsed_text=doc.parsed_text,
        is_archived=doc.is_archived,
        metadata=doc.meta_data,
    )
