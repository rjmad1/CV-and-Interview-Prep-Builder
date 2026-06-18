import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.api.src.database import Base
from apps.api.src.models import User, Skill, JobDescription, SkillRequirement, GapAnalysis
from apps.api.src.engine.jd_analyzer import JDAnalyzer

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
    
    # Create standard profile skills
    skill1 = Skill(id=uuid.uuid4(), user_id=user.id, name="Python", category="technical")
    skill2 = Skill(id=uuid.uuid4(), user_id=user.id, name="FastAPI", category="technical")
    session.add(skill1)
    session.add(skill2)
    session.commit()
    
    yield session
    session.close()

def test_skills_normalization():
    analyzer = JDAnalyzer(None)
    skills = ["fast-api", "postgres", "Docker Containerization", "custom_skill"]
    normalized = analyzer.normalize_skills(skills)
    
    assert "FastAPI" in normalized
    assert "PostgreSQL" in normalized
    assert "Docker" in normalized
    assert "custom_skill" in normalized

@pytest.mark.asyncio
async def test_analyze_job_description():
    analyzer = JDAnalyzer(None)
    # Testing LLM mock response extraction
    res = await analyzer.analyze_job_description("Raw job description text.")
    assert res["company"] is not None
    assert len(res["extracted_skills"]) > 0

def test_perform_gap_analysis(db_session):
    user = db_session.query(User).first()
    analyzer = JDAnalyzer(db_session)
    
    extracted_skills = ["Python", "FastAPI", "Next.js"]
    required_keywords = ["Cloud Architecture"]
    
    analysis = analyzer.perform_gap_analysis(user.id, extracted_skills, required_keywords)
    
    # Python & FastAPI are matched, Next.js is missing
    gaps = {g["skill"]: g["status"] for g in analysis["gap_analysis"]}
    assert gaps["Python"] == "Matched"
    assert gaps["FastAPI"] == "Matched"
    assert gaps["Next.js"] == "Missing"
    # Match score = 2 / 3 -> ~66.7%
    assert analysis["score"] == round(2/3 * 100, 2)

def test_persist_analysis_results(db_session):
    user = db_session.query(User).first()
    analyzer = JDAnalyzer(db_session)
    jd_id = uuid.uuid4()
    
    company = "Google"
    title = "Systems Architect"
    raw_text = "Google is looking for a Systems Architect."
    extracted_skills = ["Python", "FastAPI"]
    required_keywords = ["Architect"]
    gap_analysis = [
        {"skill": "Python", "importance": "high", "status": "Matched"},
        {"skill": "FastAPI", "importance": "high", "status": "Matched"}
    ]
    
    analyzer.persist_analysis_results(
        user_id=user.id,
        jd_id=jd_id,
        company=company,
        title=title,
        raw_text=raw_text,
        extracted_skills=extracted_skills,
        required_keywords=required_keywords,
        gap_analysis=gap_analysis
    )
    
    # Verify records exist in database
    jd = db_session.query(JobDescription).filter(JobDescription.id == jd_id).first()
    assert jd is not None
    assert jd.company == "Google"
    
    reqs = db_session.query(SkillRequirement).filter(SkillRequirement.jd_id == jd_id).all()
    assert len(reqs) == 2
    
    gaps = db_session.query(GapAnalysis).filter(GapAnalysis.jd_id == jd_id).all()
    assert len(gaps) == 2
