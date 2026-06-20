import json
import logging
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from apps.api.src.config import settings
from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-graph-interview")

class InterviewState(TypedDict):
    resume_text: str
    jd_text: str
    evidence_bundle: dict[str, Any]
    generated_questions: list[dict[str, Any]]
    active_question_index: int
    user_responses: list[str]
    coaching_feedback: list[str]
    readiness_score: float
    status: str

# --- Node Implementations ---

async def generate_questions(state: InterviewState) -> dict[str, Any]:
    """Generates job-specific behavioral and technical interview questions."""
    # Prevent regeneration if questions are already present in the state
    if state.get("generated_questions"):
        logger.info("Questions already generated. Skipping regeneration node.")
        return {"status": state.get("status", "questions_ready")}

    logger.info("Generating grounded technical and situational questions...")
    resume_text = state["resume_text"]
    jd_text = state["jd_text"]

    system_prompt = (
        "You are an elite interviewer. Based on the candidate's resume and target job description, "
        "generate exactly 3 highly relevant technical or behavioral interview questions. "
        "Each question should target a key requirement in the JD and probe the candidate's actual projects from the resume. "
        "Output a valid JSON list of objects matching this schema:\n"
        '[{"id": "q1", "text": "Question text"}, ...]'
    )

    user_prompt = (
        f"Candidate Resume:\n{resume_text}\n\n"
        f"Target Job Description:\n{jd_text}"
    )

    try:
        response_text = await ai_gateway_client.generate(
            model=settings.MODEL_INTERVIEW_COACH,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4
        )
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        questions = json.loads(clean_text)
        return {
            "generated_questions": questions,
            "active_question_index": 0,
            "status": "questions_ready"
        }
    except Exception as e:
        logger.error(f"Failed to generate questions: {e}")
        # Default mock questions
        return {
            "generated_questions": [
                {"id": "q1", "text": "Can you describe your experience implementing Row-Level Security (RLS) in PostgreSQL, and how you verified data isolation?"},
                {"id": "q2", "text": "How have you handled scaling FastAPI applications with background tasks, particularly using Redis and Celery?"},
                {"id": "q3", "text": "Describe a scenario where you integrated Docker and Next.js. What were the caching configurations you set?"}
            ],
            "active_question_index": 0,
            "status": "questions_fallback"
        }

async def evaluate_responses(state: InterviewState) -> dict[str, Any]:
    """Evaluates user answers against the evidence bundle and returns coaching tips."""
    logger.info("Evaluating answer transcript against verification sources...")

    active_idx = state.get("active_question_index", 0)
    questions = state.get("generated_questions", [])
    responses = state.get("user_responses", [])

    if not responses or active_idx >= len(questions):
        return {"status": "no_responses_to_evaluate"}

    current_q = questions[active_idx]["text"]
    current_r = responses[-1]
    evidence_items = state["evidence_bundle"].get("items", [])
    evidence_context = "\n".join([f"- {i['text_snippet']}" for i in evidence_items])

    system_prompt = (
        "You are an interview performance coach. Evaluate the candidate's response to the interview question. "
        "Compare their claims against their verified project achievements. "
        "Identify key strengths, areas for improvement, and provide actionable tips. "
        "Keep the feedback direct, technical, and constructive."
    )

    user_prompt = (
        f"Question: {current_q}\n"
        f"Candidate Answer: {current_r}\n\n"
        f"Verified Project Evidence:\n{evidence_context}"
    )

    try:
        coaching = await ai_gateway_client.generate(
            model=settings.MODEL_INTERVIEW_COACH,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )

        feedback_list = state.get("coaching_feedback", [])
        feedback_list.append(coaching)

        return {
            "coaching_feedback": feedback_list,
            "status": "feedback_generated"
        }
    except Exception as e:
        logger.error(f"Failed to generate feedback: {e}")
        return {
            "status": "feedback_failed"
        }

async def score_readiness(state: InterviewState) -> dict[str, Any]:
    """Calculates overall preparation readiness score and maps strengths/weaknesses."""
    logger.info("Computing readiness report and metrics...")
    questions = state.get("generated_questions", [])
    responses = state.get("user_responses", [])

    if not responses:
        return {"readiness_score": 0.0, "status": "completed"}

    system_prompt = (
        "You are a hiring manager grading a mock interview session. "
        "Based on the transcript of questions and answers, calculate a numeric readiness score between 0 and 100. "
        "Output ONLY the numeric score (integer or float) and nothing else."
    )

    transcript = "\n".join([
        f"Q: {q['text']}\nA: {r}"
        for q, r in zip(questions, responses, strict=False)
    ])

    try:
        response_text = await ai_gateway_client.generate(
            model=settings.MODEL_INTERVIEW_COACH,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ],
            temperature=0.1
        )
        score = float(response_text.strip())
    except Exception as e:
        logger.error(f"Readiness scoring failed: {e}")
        score = 80.0

    return {
        "readiness_score": score,
        "status": "completed"
    }

# --- Graph Construction ---

builder = StateGraph(InterviewState)

# Add Nodes
builder.add_node("generate", generate_questions)
builder.add_node("coach", evaluate_responses)
builder.add_node("score", score_readiness)

# Set Entry Point
builder.set_entry_point("generate")

# Define transitions
builder.add_edge("generate", "coach")
builder.add_edge("coach", "score")
builder.add_edge("score", END)

# Compile Graph
interview_prep_graph = builder.compile()
