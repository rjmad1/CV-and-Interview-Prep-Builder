import pytest
from apps.api.src.engine.classification_engine import ClassificationEngine

def test_heuristic_classification_resume():
    engine = ClassificationEngine()
    text = "Professional CV of John Doe. Summary of qualifications, skills, and work experience at Google."
    category = engine.classify_heuristics(text)
    assert category == "resume"

def test_heuristic_classification_verification():
    engine = ClassificationEngine()
    text = "This is to certify that John Doe has successfully obtained the degree of Master of Science."
    category = engine.classify_heuristics(text)
    assert category == "verification"

def test_heuristic_classification_achievement():
    engine = ClassificationEngine()
    text = "Recipient of the Nobel Prize award for outstanding contributions to computer science."
    category = engine.classify_heuristics(text)
    assert category == "achievement"

@pytest.mark.asyncio
async def test_classification_engine_classify_fallback():
    engine = ClassificationEngine()
    # Ambiguous text should trigger the mock AI client (which returns 'resume' / 'verification' / 'achievement' based on contents)
    category = await engine.classify("Ambiguous text with some words.")
    assert category in ["resume", "verification", "achievement"]
