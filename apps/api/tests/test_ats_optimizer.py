import pytest
import uuid
import os
import tempfile
from fastapi.testclient import TestClient
from apps.api.src.main import app
from apps.api.src.database import get_db, Base
from apps.api.src.models import User, Document, DocumentChunk, ResumeTemplate, ResumeVersion, JobDescription, SkillRequirement
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

def test_ats_optimize_endpoint(client):
    db = next(app.dependency_overrides[get_db]())
    user = db.query(User).first()
    
    # 1. Create a job description
    jd = JobDescription(
        id=uuid.uuid4(),
        user_id=user.id,
        company="NVIDIA",
        title="AI Engineer",
        raw_text="Looking for an AI Engineer with expertise in CUDA, LLMs, and Python."
    )
    db.add(jd)
    db.commit()
    
    # 2. Add skill requirements
    req1 = SkillRequirement(id=uuid.uuid4(), jd_id=jd.id, skill_name="CUDA", importance="high")
    req2 = SkillRequirement(id=uuid.uuid4(), jd_id=jd.id, skill_name="Python", importance="high")
    db.add(req1)
    db.add(req2)
    db.commit()
    
    # 3. Create a template and resume version
    template = ResumeTemplate(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Developer Template",
        file_path="c:/Users/rajaj/Projects/CV and Interview Prep Builder/specs/templates/default_resume.docx"
    )
    db.add(template)
    db.commit()
    
    # Create temp resume file
    resume_file_fd, resume_file_path = tempfile.mkstemp(suffix=".docx")
    os.close(resume_file_fd)
    import shutil
    shutil.copy("c:/Users/rajaj/Projects/CV and Interview Prep Builder/specs/templates/default_resume.docx", resume_file_path)
    
    rv = ResumeVersion(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=template.id,
        version_number=1,
        jd_id=jd.id,
        generated_text="Lead Engineer with experience building API backends in Python.",
        file_path=resume_file_path
    )
    db.add(rv)
    db.commit()
    
    # 4. Create document chunk for grounding
    doc = Document(
        id=uuid.uuid4(),
        user_id=user.id,
        filename="resume.docx",
        file_path="resume.docx",
        mime_type="docx",
        document_type="resume",
        parsed_text="Lead Engineer with experience building API backends in Python."
    )
    db.add(doc)
    db.commit()
    
    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        user_id=user.id,
        chunk_index=0,
        chunk_text="Experienced with CUDA computing, LLMs and FastAPI backends in Python."
    )
    db.add(chunk)
    db.commit()
    
    # Call optimization endpoint
    payload = {
        "resume_version_id": str(rv.id),
        "jd_id": str(jd.id)
    }
    response = client.post("/api/ats/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["optimized_resume_id"] is not None
    assert data["version"] == 2
    assert data["new_score"] >= data["initial_score"]
    
    # Clean up temp resume file
    try:
        os.unlink(resume_file_path)
    except OSError:
        pass
