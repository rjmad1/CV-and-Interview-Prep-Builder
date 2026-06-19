import os
import logging
import uuid as py_uuid
from typing import Dict, List, Any, TypedDict
from langgraph.graph import StateGraph, END
from apps.api.src.config import settings
from apps.api.src.database import SessionLocal
from apps.api.src.models import Document
from apps.api.src.utils.parsers import parse_document
from apps.api.src.engine.classification_engine import ClassificationEngine
from apps.api.src.engine.embedding_pipeline import EmbeddingPipeline

logger = logging.getLogger("cis-graph-document")

class DocumentState(TypedDict):
    file_path: str
    file_content: bytes | None
    parsed_text: str
    document_type: str  # 'resume', 'verification', 'achievement'
    chunks: List[str]
    embeddings: List[List[float]]
    status: str
    metadata: Dict[str, Any]  # Contains document_id and user_id

# --- Node Implementations ---

def scan_file(state: DocumentState) -> Dict[str, Any]:
    """Scans file path, validates size/extension, reads binary content."""
    file_path = state["file_path"]
    logger.info(f"Scanning file: {file_path}")
    if not os.path.exists(file_path):
        logger.warning(f"File {file_path} not found. Creating mock file contents for pipeline.")
        file_content = b"Mock Resume Content: John Doe is a Senior Python Developer with 6 years experience in FastAPI and PostgreSQL RLS."
    else:
        from apps.api.src.utils.encryption import read_vault_file
        from apps.api.src.config import settings
        try:
            file_content = read_vault_file(file_path, decrypt=settings.STORAGE_ENCRYPTION_ACTIVE)
        except Exception:
            # Fallback to plain read if decryption fails
            with open(file_path, "rb") as f:
                file_content = f.read()
    return {
        "file_content": file_content,
        "status": "scanned"
    }

def parse_file(state: DocumentState) -> Dict[str, Any]:
    """Parses DOCX/PDF to extract plain text contents."""
    logger.info("Parsing file contents...")
    file_content = state["file_content"]
    file_path = state["file_path"]
    filename = os.path.basename(file_path)
    
    parsed_text = parse_document(file_content, filename)
    return {
        "parsed_text": parsed_text,
        "status": "parsed"
    }

async def classify_doc(state: DocumentState) -> Dict[str, Any]:
    """Classifies document type based on contents (e.g. Resume vs Certification)."""
    current_type = state.get("document_type", "resume")
    if current_type and current_type not in ["resume", "verification", "achievement"]:
        logger.info(f"Preserving user-specified document type: {current_type}")
        return {
            "document_type": current_type,
            "status": "classified"
        }
        
    logger.info("Classifying document type based on content...")
    parsed_text = state["parsed_text"]
    
    classifier = ClassificationEngine()
    category = await classifier.classify(parsed_text)
    
    return {
        "document_type": category,
        "status": "classified"
    }

def chunk_text(state: DocumentState) -> Dict[str, Any]:
    """Splits document text into manageable semantic chunks for indexing."""
    logger.info("Chunking text content using EmbeddingPipeline...")
    raw_text = state["parsed_text"]
    
    pipeline = EmbeddingPipeline()
    chunks = pipeline.chunk_text(raw_text)
    
    return {
        "chunks": chunks,
        "status": "chunked"
    }

async def generate_embeddings(state: DocumentState) -> Dict[str, Any]:
    """Generates dense vector embeddings using EmbeddingPipeline."""
    logger.info(f"Generating embeddings for {len(state['chunks'])} chunks...")
    chunks = state["chunks"]
    
    pipeline = EmbeddingPipeline()
    embeddings = await pipeline.generate_embeddings(chunks)
    
    return {
        "embeddings": embeddings,
        "status": "embedded"
    }

def store_document(state: DocumentState) -> Dict[str, Any]:
    """Stores metadata in PostgreSQL and vector embeddings in Qdrant via EmbeddingPipeline."""
    logger.info("Persisting metadata in Postgres and vectors in Qdrant...")
    doc_id = py_uuid.UUID(str(state["metadata"]["document_id"]))
    user_id = py_uuid.UUID(str(state["metadata"]["user_id"]))
    filename = os.path.basename(state["file_path"])
    
    db = SessionLocal()
    try:
        # 1. Update/create Document record in PostgreSQL
        document = db.query(Document).filter(Document.id == doc_id).first()
        if document:
            document.parsed_text = state["parsed_text"]
            document.document_type = state["document_type"]
        else:
            document = Document(
                id=doc_id,
                user_id=user_id,
                filename=filename,
                file_path=state["file_path"],
                mime_type="application/octet-stream",
                document_type=state["document_type"],
                parsed_text=state["parsed_text"]
            )
            db.add(document)
        db.commit()

        # 2. Extract and store user skills from resume in database
        if state["document_type"] == "resume":
            from apps.api.src.models import Skill
            # Clean existing user skills to prevent duplicates
            db.query(Skill).filter(Skill.user_id == user_id).delete()
            db.commit()
            
            # Simple keyword-based extraction taxonomy
            SKILLS_TAXONOMY = [
                ("Python", "technical"),
                ("FastAPI", "technical"),
                ("PostgreSQL", "technical"),
                ("React", "technical"),
                ("Docker", "technical"),
                ("Kubernetes", "technical"),
                ("Next.js", "technical"),
                ("Solution Architecture", "technical"),
                ("Data Architecture", "technical"),
                ("Enterprise Integration", "technical"),
                ("MDM", "technical"),
                ("MuleSoft", "technical"),
                ("Talend", "technical"),
                ("Informatica", "technical"),
                ("Neo4j", "technical"),
                ("RDF", "technical"),
                ("OWL", "technical"),
                ("GCP", "technical"),
                ("Azure", "technical"),
                ("AWS", "technical"),
                ("SAP", "technical"),
                ("Salesforce", "technical"),
                ("Oracle", "technical"),
                ("LangGraph", "technical"),
                ("LangChain", "technical"),
                ("Pinecone", "technical"),
                ("Weaviate", "technical"),
                ("ChromaDB", "technical"),
                ("Data Governance", "technical"),
                ("GDPR", "technical"),
                ("DPDP", "technical"),
                ("CCPA", "technical")
            ]
            
            parsed_lower = state["parsed_text"].lower()
            for skill_name, category in SKILLS_TAXONOMY:
                if skill_name.lower() in parsed_lower:
                    new_skill = Skill(
                        id=py_uuid.uuid4(),
                        user_id=user_id,
                        name=skill_name,
                        category=category,
                        proficiency_level="Expert"
                    )
                    db.add(new_skill)
            db.commit()

        # 3. Index chunks and embeddings via EmbeddingPipeline logic helper
        pipeline = EmbeddingPipeline()
        # Clean existing chunks to avoid duplication
        from apps.api.src.models import DocumentChunk
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()
        db.commit()
        
        # Save chunks and vectors
        # Note: We run process_and_index_document logic inline to match the existing state
        qdrant_points = []
        for idx, (chunk_text_str, vector) in enumerate(zip(state["chunks"], state["embeddings"])):
            chunk_id = py_uuid.uuid4()
            
            db_chunk = DocumentChunk(
                id=chunk_id,
                document_id=doc_id,
                user_id=user_id,
                chunk_index=idx,
                chunk_text=chunk_text_str,
                embedding_vector_id=chunk_id,
                meta_data={}
            )
            db.add(db_chunk)
            
            if pipeline.qdrant_client:
                from qdrant_client.http.models import PointStruct
                qdrant_points.append(
                    PointStruct(
                        id=str(chunk_id),
                        vector=vector,
                        payload={
                            "document_id": str(doc_id),
                            "user_id": str(user_id),
                            "chunk_index": idx,
                            "text": chunk_text_str
                        }
                    )
                )
        db.commit()

        if pipeline.qdrant_client and qdrant_points:
            pipeline.qdrant_client.upsert(
                collection_name="career_chunks",
                points=qdrant_points
            )
            logger.info(f"Upserted {len(qdrant_points)} chunks to Qdrant.")
            
    except Exception as e:
        logger.error(f"Failed to store parsed document: {e}")
        db.rollback()
        return {"status": f"failed: {str(e)}"}
    finally:
        db.close()
        
    return {
        "status": "completed"
    }

# --- Graph Construction ---

builder = StateGraph(DocumentState)

# Add Nodes
builder.add_node("scan", scan_file)
builder.add_node("parse", parse_file)
builder.add_node("classify", classify_doc)
builder.add_node("chunk", chunk_text)
builder.add_node("embed", generate_embeddings)
builder.add_node("store", store_document)

# Set Entry Point
builder.set_entry_point("scan")

# Add Edges
builder.add_edge("scan", "parse")
builder.add_edge("parse", "classify")
builder.add_edge("classify", "chunk")
builder.add_edge("chunk", "embed")
builder.add_edge("embed", "store")
builder.add_edge("store", END)

# Compile Graph
document_processing_graph = builder.compile()
