import asyncio
import logging

from celery import Celery

from apps.api.src.config import settings

logger = logging.getLogger("cis-celery-tasks")

celery_app = Celery(
    "cis_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Set Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="tasks.process_document")
def process_document_task(document_id: str, user_id: str, file_path: str):
    """Celery background task to trigger the LangGraph document processing flow."""
    logger.info(f"Triggering background ingestion for document {document_id} and user {user_id}")
    from apps.api.src.graph.document_processing import document_processing_graph

    # Run the async LangGraph workflow synchronously inside the worker process
    async def run_flow():
        initial_state = {
            "file_path": file_path,
            "file_content": None,
            "parsed_text": "",
            "document_type": "resume",
            "chunks": [],
            "embeddings": [],
            "status": "initiated",
            "metadata": {"document_id": document_id, "user_id": user_id}
        }
        # Invoke the LangGraph workflow
        result = await document_processing_graph.ainvoke(initial_state)
        return result

    result = asyncio.run(run_flow())
    logger.info(f"Ingestion flow finished with status: {result.get('status')}")
    return result.get("status")
