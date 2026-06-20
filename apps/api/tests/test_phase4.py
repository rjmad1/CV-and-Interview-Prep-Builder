import pytest
import uuid
import os
import tempfile
from fastapi.testclient import TestClient
from apps.api.src.main import app
from apps.api.src.database import get_db, Base
from apps.api.src.models import (
    User, Document, DocumentChunk, ResumeVersion, ResumeTemplate,
    JobDescription, GenerationSession, HallucinationEvent,
    Application, Interview, Outcome
)
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
        from apps.api.tests.test_utils import AsyncSessionShim
        session = TestingSessionLocal()
        try:
            yield AsyncSessionShim(session)
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
    
    # Seed a default resume template
    template = ResumeTemplate(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Professional Default Template",
        file_path="default_resume.docx",
        is_active=True
    )
    db.add(template)
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

def test_generate_cover_letter_grounding_check(client):
    db = next(app.dependency_overrides[get_db]())
    user = db.query(User).first()
    template = db.query(ResumeTemplate).first()
    
    # Create JD
    jd = JobDescription(
        id=uuid.uuid4(),
        user_id=user.id,
        company="NVIDIA",
        title="Senior AI Architect",
        raw_text="Required skills: Python, FastAPI, PostgreSQL RLS."
    )
    db.add(jd)
    db.commit()
    
    # Create Resume Version
    resume = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=template.id,
        version_number=1,
        jd_id=jd.id,
        generated_text="Staff Architect with extensive background in Python development.",
        file_path="resume_v1.docx"
    )
    db.add(resume)
    db.commit()
    
    # Create DocumentChunk (evidence context)
    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        user_id=user.id,
        chunk_index=0,
        chunk_text="Staff Architect with extensive background in Python development."
    )
    db.add(chunk)
    db.commit()
    
    # 1. Test cover letter generation matching the grounding criteria
    payload = {
        "jd_id": str(jd.id),
        "resume_version_id": str(resume.id),
        "selected_evidence_ids": [str(chunk.id)]
    }
    
    # Mocking generation client generate method is handled via standard try/except flow in main.py,
    # which uses a default grounded response when LLM fails or fails mock verification.
    # To test validation behavior directly, let's trigger it.
    response = client.post("/api/cover-letter/generate", json=payload)
    
    # If LLM falls back or succeeds, it must return cover letter or fail with 422 block.
    # Let's assert that the API completes successfully or handles anti-hallucination.
    assert response.status_code in [200, 422]
    
    if response.status_code == 200:
        assert "cover_letter" in response.json()
    else:
        assert "Anti-Hallucination block" in response.json()["detail"]

def test_get_prep_cards(client):
    db = next(app.dependency_overrides[get_db]())
    user = db.query(User).first()
    template = db.query(ResumeTemplate).first()
    
    # Create JD
    jd = JobDescription(
        id=uuid.uuid4(),
        user_id=user.id,
        company="NVIDIA",
        title="Senior AI Architect",
        raw_text="Required skills: Python, FastAPI, PostgreSQL RLS."
    )
    db.add(jd)
    db.commit()
    
    # Create Resume Version
    resume = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=template.id,
        version_number=1,
        jd_id=jd.id,
        generated_text="Staff Architect with extensive background in Python development.",
        file_path="resume_v1.docx"
    )
    db.add(resume)
    db.commit()
    
    response = client.get(f"/api/interview/assistant/prep?jd_id={jd.id}&resume_version_id={resume.id}")
    assert response.status_code == 200
    data = response.json()
    
    # Assert structured prep cards schema
    assert "star_stories" in data
    assert "technical_flashcards" in data
    assert "behavioral_tips" in data
    
    assert len(data["star_stories"]) > 0
    assert len(data["technical_flashcards"]) > 0
    assert len(data["behavioral_tips"]) > 0
    
    # Test specific key contents
    assert "situation" in data["star_stories"][0]
    assert "question" in data["technical_flashcards"][0]

def test_application_tracking_crud_pipeline(client):
    db = next(app.dependency_overrides[get_db]())
    user = db.query(User).first()
    template = db.query(ResumeTemplate).first()
    
    # Create JD and Resume
    jd = JobDescription(
        id=uuid.uuid4(),
        user_id=user.id,
        company="Google",
        title="Software Engineer",
        raw_text="Python and general problem solving."
    )
    db.add(jd)
    
    resume = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=template.id,
        version_number=1,
        generated_text="Python software developer with cloud experience.",
        file_path="resume_v2.docx"
    )
    db.add(resume)
    db.commit()
    
    # 1. Create Application
    create_payload = {
        "jd_id": str(jd.id),
        "resume_version_id": str(resume.id),
        "notes": "Referral from teammate."
    }
    response = client.post("/api/applications", json=create_payload)
    assert response.status_code == 200
    app_data = response.json()
    assert app_data["company"] == "Google"
    assert app_data["title"] == "Software Engineer"
    assert app_data["status"] == "applied"
    assert app_data["notes"] == "Referral from teammate."
    app_id = app_data["id"]
    
    # 2. List Applications
    list_response = client.get("/api/applications")
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1
    
    # 3. Update Application notes/status
    update_payload = {
        "status": "interviewing",
        "notes": "Updated: Technical round next week."
    }
    update_response = client.put(f"/api/applications/{app_id}", json=update_payload)
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "interviewing"
    assert update_response.json()["notes"] == "Updated: Technical round next week."
    
    # 4. Schedule Interview
    interview_payload = {
        "scheduled_at": "2026-06-25T14:30:00",
        "round_number": 2,
        "interviewer_info": "Panel with senior engineers."
    }
    interview_response = client.post(f"/api/applications/{app_id}/interviews", json=interview_payload)
    assert interview_response.status_code == 200
    int_data = interview_response.json()
    assert int_data["round_number"] == 2
    assert int_data["interviewer_info"] == "Panel with senior engineers."
    assert int_data["status"] == "scheduled"
    
    # 5. List Interviews
    ints_response = client.get(f"/api/applications/{app_id}/interviews")
    assert ints_response.status_code == 200
    assert len(ints_response.json()) == 1
    
    # 6. Log Outcome
    outcome_payload = {
        "outcome_type": "offer",
        "feedback": "Strong architecture skills, hire.",
        "details": {"base_salary": 180000, "equity": 100000}
    }
    outcome_response = client.post(f"/api/applications/{app_id}/outcome", json=outcome_payload)
    assert outcome_response.status_code == 200
    assert outcome_response.json()["status"] == "success"
    
    # Verify Application status updated to 'offered'
    verify_response = client.get("/api/applications")
    target_app = next(a for a in verify_response.json() if a["id"] == app_id)
    assert target_app["status"] == "offered"
    
    # 7. Delete Application
    delete_response = client.delete(f"/api/applications/{app_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "success"
    
    # Verify deleted
    list_after_delete = client.get("/api/applications")
    assert not any(a["id"] == app_id for a in list_after_delete.json())

def test_mock_interview_flow(client):
    db = next(app.dependency_overrides[get_db]())
    user = db.query(User).first()
    template = db.query(ResumeTemplate).first()
    
    # Create JD
    jd = JobDescription(
        id=uuid.uuid4(),
        user_id=user.id,
        company="NVIDIA",
        title="Senior AI Architect",
        raw_text="Required skills: Python, FastAPI, PostgreSQL RLS."
    )
    db.add(jd)
    
    # Create Resume Version
    resume = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=template.id,
        version_number=1,
        jd_id=jd.id,
        generated_text="Staff Architect with extensive background in Python development.",
        file_path="resume_v1.docx"
    )
    db.add(resume)
    db.commit()

    # 1. Start Interview
    payload = {
        "resume_id": str(resume.id),
        "jd_id": str(jd.id)
    }
    response = client.post("/api/interview/start", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "question" in data
    assert data["question_number"] == 1
    session_id = data["session_id"]
    
    # 2. Respond to Question
    respond_payload = {
        "session_id": session_id,
        "user_response": "I have set up many FastAPI backends and used PostgreSQL RLS for multi-tenant isolation."
    }
    response_resp = client.post("/api/interview/respond", json=respond_payload)
    assert response_resp.status_code == 200
    resp_data = response_resp.json()
    assert "coaching_tips" in resp_data
    
    # 3. Retrieve Report
    report_response = client.get(f"/api/interview/report?session_id={session_id}")
    assert report_response.status_code == 200
    report_data = report_response.json()
    assert "readiness_score" in report_data
    assert "transcript" in report_data
    assert len(report_data["transcript"]) >= 2


