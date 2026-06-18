import pytest
import uuid
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.api.src.database import Base
from apps.api.src.models import User
from apps.api.src.engine.career_repository import CareerRepository

# Set up in-memory database for testing
@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    
    # Create default user for testing
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password="hashed_pwd",
        first_name="Test",
        last_name="User"
    )
    session.add(user)
    session.commit()
    
    try:
        yield session
    finally:
        session.close()

def test_add_get_experience(db_session):
    user = db_session.query(User).first()
    repo = CareerRepository(db_session)
    
    # Add experience
    exp = repo.add_experience(
        user_id=user.id,
        company_name="Google",
        role_title="L5 Software Engineer",
        start_date=date(2022, 1, 1),
        description="Developing agentic systems.",
        is_current=True
    )
    
    assert exp.id is not None
    assert exp.company_name == "Google"
    
    # Fetch experience
    exps = repo.get_experiences(user.id)
    assert len(exps) == 1
    assert exps[0].role_title == "L5 Software Engineer"

def test_get_user_profile_aggregation(db_session):
    user = db_session.query(User).first()
    repo = CareerRepository(db_session)
    
    # Add experience, skill, cert
    repo.add_experience(
        user_id=user.id,
        company_name="Google",
        role_title="L5 Software Engineer",
        start_date=date(2022, 1, 1),
        description="Developing agentic systems."
    )
    repo.add_skill(
        user_id=user.id,
        name="Python",
        category="technical",
        proficiency_level="Expert"
    )
    repo.add_certification(
        user_id=user.id,
        name="Google Cloud Architect",
        issuing_organization="Google",
        issue_date=date(2023, 5, 1)
    )
    
    profile = repo.get_user_profile(user.id)
    assert len(profile["experiences"]) == 1
    assert len(profile["skills"]) == 1
    assert len(profile["certifications"]) == 1
    assert profile["skills"][0].name == "Python"
    assert profile["certifications"][0].name == "Google Cloud Architect"

def test_document_crud(db_session):
    user = db_session.query(User).first()
    repo = CareerRepository(db_session)
    
    # Create document
    doc = repo.create_document(
        user_id=user.id,
        filename="my_cv.pdf",
        file_path="/path/to/my_cv.pdf",
        mime_type="application/pdf",
        document_type="resume",
        parsed_text="Software engineer with experience.",
        metadata={"size": 1024}
    )
    
    assert doc.id is not None
    assert doc.filename == "my_cv.pdf"
    
    # Get document
    fetched = repo.get_document(user.id, doc.id)
    assert fetched is not None
    assert fetched.parsed_text == "Software engineer with experience."
    
    # Delete document
    deleted = repo.delete_document(user.id, doc.id)
    assert deleted is True
    assert repo.get_document(user.id, doc.id) is None
