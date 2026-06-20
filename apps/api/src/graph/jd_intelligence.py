import logging
import uuid
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from apps.api.src.database import SessionLocal
from apps.api.src.engine.jd_analyzer import JDAnalyzer

logger = logging.getLogger("cis-graph-jd")

class JDState(TypedDict):
    user_id: str
    jd_raw_text: str
    company: str
    title: str
    extracted_skills: list[str]
    required_keywords: list[str]
    experience_gaps: list[dict[str, Any]]
    score: float
    status: str
    metadata: dict[str, Any]

# --- Node Implementations ---

async def extract_requirements(state: JDState) -> dict[str, Any]:
    """Extracts required skills and keywords from raw job description text via JDAnalyzer."""
    logger.info("Extracting requirements from job description...")
    db = SessionLocal()
    try:
        analyzer = JDAnalyzer(db)
        res = await analyzer.analyze_job_description(state["jd_raw_text"])
        return {
            "company": res["company"],
            "title": res["title"],
            "extracted_skills": res["extracted_skills"],
            "required_keywords": res["required_keywords"],
            "status": "extracted"
        }
    finally:
        db.close()

def normalize_skills(state: JDState) -> dict[str, Any]:
    """Normalizes extracted skills against standardized taxonomy values using JDAnalyzer."""
    logger.info("Normalizing extracted skills...")
    db = SessionLocal()
    try:
        analyzer = JDAnalyzer(db)
        normalized = analyzer.normalize_skills(state["extracted_skills"])
        return {
            "extracted_skills": normalized,
            "status": "normalized"
        }
    finally:
        db.close()

def calculate_gaps_and_score(state: JDState) -> dict[str, Any]:
    """Performs gap analysis matching user skills and computes compatibility score using JDAnalyzer."""
    logger.info("Calculating skill gap metrics...")
    db = SessionLocal()
    try:
        analyzer = JDAnalyzer(db)
        res = analyzer.perform_gap_analysis(
            user_id=state["user_id"],
            extracted_skills=state["extracted_skills"],
            required_keywords=state["required_keywords"]
        )
        return {
            "experience_gaps": res["gap_analysis"],
            "score": res["score"],
            "status": "scored"
        }
    finally:
        db.close()

def persist_analysis(state: JDState) -> dict[str, Any]:
    """Persists job descriptions and analysis results to database using JDAnalyzer."""
    logger.info("Persisting JD and gap analysis details to DB...")
    user_id = state["user_id"]
    jd_id = state["metadata"].get("jd_id", str(uuid.uuid4()))

    db = SessionLocal()
    try:
        analyzer = JDAnalyzer(db)
        analyzer.persist_analysis_results(
            user_id=user_id,
            jd_id=jd_id,
            company=state["company"],
            title=state["title"],
            raw_text=state["jd_raw_text"],
            extracted_skills=state["extracted_skills"],
            required_keywords=state["required_keywords"],
            gap_analysis=state["experience_gaps"]
        )
    finally:
        db.close()

    return {
        "metadata": {**state["metadata"], "jd_id": jd_id},
        "status": "completed"
    }

# --- Graph Construction ---

builder = StateGraph(JDState)

# Add Nodes
builder.add_node("extract", extract_requirements)
builder.add_node("normalize", normalize_skills)
builder.add_node("evaluate_gaps", calculate_gaps_and_score)
builder.add_node("persist", persist_analysis)

# Set Entry Point
builder.set_entry_point("extract")

# Add Edges
builder.add_edge("extract", "normalize")
builder.add_edge("normalize", "evaluate_gaps")
builder.add_edge("evaluate_gaps", "persist")
builder.add_edge("persist", END)

# Compile Graph
jd_intelligence_graph = builder.compile()
