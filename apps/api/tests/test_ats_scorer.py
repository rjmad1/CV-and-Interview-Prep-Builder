import pytest
from apps.api.src.engine.ats_scorer import ATSScorer

@pytest.mark.asyncio
async def test_ats_scorer_keywords():
    scorer = ATSScorer()
    resume = "I am a Senior Software Developer with experience in Python, FastAPI, and PostgreSQL."
    jd = "Needs Python developer with experience in PostgreSQL and React."
    keywords = ["Python", "PostgreSQL", "React"]
    
    # We run the compute_score
    result = await scorer.compute_score(resume, jd, keywords)
    
    # Verify keyword coverage: Match 2 out of 3 -> ~66.7%
    assert result["keyword_coverage"] == round(2/3, 2)
    assert "Python" in result["detailed_findings"]["matching_keywords"]
    assert "React" in result["detailed_findings"]["missing_keywords"]

@pytest.mark.asyncio
async def test_ats_scorer_readability():
    scorer = ATSScorer()
    # High passive voice count resume
    resume = "The database was designed by me. The API was engineered by the team. The systems were built."
    jd = "Software Developer."
    keywords = ["Developer"]
    
    result = await scorer.compute_score(resume, jd, keywords)
    
    # Verify passive voice warning appears in readability issues
    issues = result["detailed_findings"]["readability_issues"]
    assert any("passive voice" in issue.lower() for issue in issues)
    assert result["readability_score"] < 100.0
