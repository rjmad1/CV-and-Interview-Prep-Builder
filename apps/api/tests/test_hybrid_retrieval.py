import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.api.src.database import Base
from apps.api.src.models import User, Document, DocumentChunk, EvidenceBundle, TraceRecord
from apps.api.src.engine.hybrid_retrieval import HybridRetrieval

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    
    # Create default user
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password="hashed_pwd"
    )
    session.add(user)
    session.commit()
    
    # Create document & chunks for search testing
    doc = Document(
        id=uuid.uuid4(),
        user_id=user.id,
        filename="cv.txt",
        file_path="cv.txt",
        mime_type="text/plain",
        document_type="resume"
    )
    session.add(doc)
    session.commit()
    
    chunk1 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        user_id=user.id,
        chunk_index=0,
        chunk_text="Experienced Python backend developer."
    )
    chunk2 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        user_id=user.id,
        chunk_index=1,
        chunk_text="Frontend engineer building React user interfaces."
    )
    session.add(chunk1)
    session.add(chunk2)
    session.commit()
    
    yield session
    session.close()

def test_sparse_search_matching(db_session):
    user = db_session.query(User).first()
    retriever = HybridRetrieval(db_session)
    
    results = retriever.sparse_search(user.id, ["Python"])
    assert len(results) == 1
    assert "Python" in results[0]["text"]

def test_reciprocal_rank_fusion():
    retriever = HybridRetrieval(None)
    sparse = [{"chunk_id": "c1", "text": "chunk1", "score": 1.0}]
    dense = [{"chunk_id": "c2", "text": "chunk2", "score": 0.9}, {"chunk_id": "c1", "text": "chunk1", "score": 0.8}]
    
    merged = retriever.reciprocal_rank_fusion(sparse, dense, k=60)
    assert len(merged) == 2
    # c1 appears in both lists so it should have a higher RRF rank score than c2
    assert merged[0]["chunk_id"] == "c1"

@pytest.mark.asyncio
async def test_compile_evidence_bundle(db_session):
    user = db_session.query(User).first()
    retriever = HybridRetrieval(db_session)
    
    chunks = db_session.query(DocumentChunk).all()
    session_id = uuid.uuid4()
    
    results = [
        {"chunk_id": str(chunks[0].id), "text": chunks[0].chunk_text, "score": 0.95},
        {"chunk_id": str(chunks[1].id), "text": chunks[1].chunk_text, "score": 0.75}
    ]
    
    bundle = retriever.compile_evidence_bundle(
        user_id=user.id,
        session_id=session_id,
        reranked_results=results
    )
    
    assert bundle["bundle_id"] is not None
    assert len(bundle["items"]) == 2
    assert bundle["items"][0]["chunk_id"] == str(chunks[0].id)
    
    # Check trace records in SQL database
    traces = db_session.query(TraceRecord).filter(TraceRecord.bundle_id == uuid.UUID(bundle["bundle_id"])).all()
    assert len(traces) == 2
    assert float(traces[0].confidence_score) == 0.95
