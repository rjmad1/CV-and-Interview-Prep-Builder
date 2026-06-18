import pytest
import uuid
import os
import tempfile
from fastapi.testclient import TestClient
from apps.api.src.main import app
from apps.api.src.database import get_db, Base
from apps.api.src.models import User, Document, DocumentChunk, HallucinationEvent, GenerationSession
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(name="client")
def fixture_client():
    # Setup temporary file-backed SQLite database
    db_fd, db_path = tempfile.mkstemp()
    db_url = f"sqlite:///{db_path}"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Override get_db dependency
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
            
    app.dependency_overrides[get_db] = override_get_db
    
    # Seed a developer user to satisfy get_current_user
    db = TestingSessionLocal()
    dev_email = "developer@career-intelligence.studio"
    user = User(
        id=uuid.uuid4(),
        email=dev_email,
        hashed_password="pbkdf2:sha256:mock_hash_for_dev",
        first_name="Lead",
        last_name="Architect",
        role="admin"
    )
    db.add(user)
    db.commit()
    db.close()
    
    client = TestClient(app)
    yield client
    
    app.dependency_overrides.clear()
    
    # Cleanup temp database file
    os.close(db_fd)
    try:
        os.unlink(db_path)
    except OSError:
        pass

def test_list_hallucinations(client):
    db = next(app.dependency_overrides[get_db]())
    user = db.query(User).first()
    
    sess = GenerationSession(
        id=uuid.uuid4(),
        user_id=user.id,
        session_type="resume_optimization"
    )
    db.add(sess)
    db.commit()
    
    event = HallucinationEvent(
        id=uuid.uuid4(),
        session_id=sess.id,
        user_id=user.id,
        generated_snippet="Engineered a nuclear reactor using Javascript.",
        validation_status="rejected",
        audit_comments="No grounding found."
    )
    db.add(event)
    db.commit()
    
    response = client.get("/api/evidence/hallucinations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["generated_snippet"] == "Engineered a nuclear reactor using Javascript."
    assert data[0]["validation_status"] == "rejected"

def test_override_hallucination(client):
    db = next(app.dependency_overrides[get_db]())
    user = db.query(User).first()
    
    sess = GenerationSession(
        id=uuid.uuid4(),
        user_id=user.id,
        session_type="resume_optimization"
    )
    db.add(sess)
    db.commit()
    
    event = HallucinationEvent(
        id=uuid.uuid4(),
        session_id=sess.id,
        user_id=user.id,
        generated_snippet="Engineered a nuclear reactor using Javascript.",
        validation_status="rejected",
        audit_comments="No grounding found."
    )
    db.add(event)
    db.commit()
    
    # Call override
    payload = {
        "event_id": str(event.id),
        "audit_comments": "It was actually true and verified on my external web profile."
    }
    response = client.post("/api/evidence/override", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify DB update
    db.refresh(event)
    assert event.validation_status == "overridden"
    assert "User Override" in event.audit_comments

def test_verify_claim_lexical_fallback(client):
    db = next(app.dependency_overrides[get_db]())
    user = db.query(User).first()
    
    doc = Document(
        id=uuid.uuid4(),
        user_id=user.id,
        filename="resume.docx",
        file_path="resume.docx",
        mime_type="docx",
        document_type="resume",
        parsed_text="Experienced with Python FastAPI and PostgreSQL database configuration."
    )
    db.add(doc)
    db.commit()
    
    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        user_id=user.id,
        chunk_index=0,
        chunk_text="Experienced with Python FastAPI and PostgreSQL database configuration."
    )
    db.add(chunk)
    db.commit()
    
    payload = {
        "text_snippet": "Python FastAPI and PostgreSQL config",
        "selected_evidence_ids": [str(chunk.id)]
    }
    response = client.post("/api/evidence/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["similarity_score"] > 0.0
    assert data["matched_chunk_id"] == str(chunk.id)
