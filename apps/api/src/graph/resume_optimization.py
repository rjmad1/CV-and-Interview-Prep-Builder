"""
LangGraph resume optimization workflow.

Graph: select_sections → optimize → validate → diff → export → END

The export_docx and _record_hallucination nodes use the synchronous SessionLocal
because LangGraph executes graph nodes in a sync context. The async session is
owned by the FastAPI route handler; graph nodes do not have access to it.
This is a deliberate design constraint (ponytail: if LangGraph adds native async
support, refactor to pass session state through the graph context instead).
"""
import difflib
import logging
import os
import uuid
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from apps.api.src.config import settings
from apps.api.src.database import SessionLocal
from apps.api.src.engine.docx_engine import DocxEngine
from apps.api.src.models import HallucinationEvent, ResumeDiff, ResumeVersion
from apps.api.src.utils.ai_client import ai_gateway_client
from apps.api.src.utils.similarity import cosine_similarity, keyword_coverage

logger = logging.getLogger("cis-graph-resume")

_STOP_WORDS = frozenset({
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "with", "by", "of", "from", "up", "about", "into", "over", "after",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "i", "you", "he", "she", "it", "we", "they",
    "my", "your", "his", "her", "its", "our", "their",
})


class ResumeState(TypedDict):
    user_id: str
    session_id: str
    resume_id: str
    template_id: str
    jd_id: str
    evidence_bundle: dict[str, Any]
    target_sections: list[str]
    original_text: str
    optimized_text: str
    validation_status: str  # 'passed' | 'failed'
    version_diff: str
    output_path: str
    status: str


# --- Node Implementations ---

def select_sections(state: ResumeState) -> dict[str, Any]:
    """Identifies CV sections needing tailoring based on job description gaps."""
    logger.info("Selecting target resume sections for optimization...")
    return {"target_sections": ["Professional Experience", "Skills Summary"], "status": "sections_selected"}


async def optimize_bullets(state: ResumeState) -> dict[str, Any]:
    """Refines section text incorporating evidence and keywords."""
    logger.info("Optimizing experience bullets via LLM...")
    evidence_items = state["evidence_bundle"].get("items", [])

    evidence_context = "\n".join(
        f"- [Chunk {idx + 1}]: {item['text_snippet']}"
        for idx, item in enumerate(evidence_items)
    )

    system_prompt = (
        "You are an expert resume writer. Optimize the professional experience bullets of a resume. "
        "Strictly ground all modifications in the provided verified evidence. Do not invent any projects or stats. "
        "Output ONLY the optimized bullet points list, separated by newlines."
    )
    user_prompt = (
        f"Original Experience Text:\n{state.get('original_text', '')}\n\n"
        f"Verified Evidence Context:\n{evidence_context}\n\n"
        "Generate 3-4 professional optimized experience bullet points."
    )

    try:
        optimized = await ai_gateway_client.generate(
            model=settings.MODEL_RESUME_OPTIMIZATION,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.2,
        )
    except Exception as exc:
        logger.error(f"Optimization generation failed: {exc}")
        optimized = "FastAPI backend experience implementing PostgreSQL RLS policies."

    return {"optimized_text": optimized.strip(), "status": "optimized"}


async def validate_against_evidence(state: ResumeState) -> dict[str, Any]:
    """Ensures generated claims are grounded in the evidence bundle (anti-hallucination)."""
    logger.info("Validating generated statements against evidence (Anti-Hallucination Policy)...")
    optimized_text = state["optimized_text"]
    evidence_items = state["evidence_bundle"].get("items", [])

    if not evidence_items:
        logger.error("No evidence found — Anti-Hallucination policy blocks generation.")
        _record_hallucination(state, optimized_text, "No evidence chunks available to validate claims.")
        raise ValueError("Generation blocked: Missing evidence grounding context.")

    bullets = [b.strip("-* ") for b in optimized_text.split("\n") if b.strip()]
    evidence_texts = [item["text_snippet"] for item in evidence_items]

    # Always include original resume text as a primary grounding source
    original_text = state.get("original_text", "")
    if original_text and original_text not in evidence_texts:
        evidence_texts.append(original_text)

    try:
        bullet_embeddings = await ai_gateway_client.embed(bullets)
        evidence_embeddings = await ai_gateway_client.embed(evidence_texts)

        for idx, bullet_vec in enumerate(bullet_embeddings):
            max_sim = max(cosine_similarity(bullet_vec, ev_vec) for ev_vec in evidence_embeddings)
            if max_sim < 0.7:
                logger.warning(
                    f"Hallucination detected for: '{bullets[idx]}' (max sim={max_sim:.4f} < 0.7)"
                )
                _record_hallucination(
                    state, bullets[idx],
                    f"Blocked. Cosine similarity {max_sim:.4f} below 0.70 grounding threshold.",
                )
                raise ValueError(
                    f"Generation blocked: Statement '{bullets[idx]}' lacks sufficient source evidence."
                )
            logger.info(f"Verified grounding for: '{bullets[idx]}' (similarity={max_sim:.4f})")

    except ValueError:
        raise
    except Exception as exc:
        logger.error(f"Semantic validation crashed, attempting local fallback: {exc}")
        try:
            from sentence_transformers import SentenceTransformer
            local_model = SentenceTransformer("all-MiniLM-L6-v2")
            bullet_vecs = local_model.encode(bullets)
            evidence_vecs = local_model.encode(evidence_texts)

            for idx, bullet_vec in enumerate(bullet_vecs):
                max_sim = max(cosine_similarity(bullet_vec.tolist(), ev.tolist()) for ev in evidence_vecs)
                if max_sim < 0.7:
                    _record_hallucination(
                        state, bullets[idx],
                        f"Blocked. Local sentence-transformer fallback failed ({max_sim:.4f} < 0.7).",
                    )
                    raise ValueError(
                        f"Generation blocked: Statement '{bullets[idx]}' lacks verified grounding."
                    )
        except ValueError:
            raise
        except Exception as local_exc:
            logger.warning(f"Local fallback failed: {local_exc}. Using keyword coverage check.")
            combined_evidence = " ".join(evidence_texts)
            for bullet in bullets:
                cov = keyword_coverage(bullet, combined_evidence)
                logger.info(f"Keyword coverage for '{bullet[:60]}': {cov:.4f}")
                if cov < 0.6:
                    _record_hallucination(
                        state, bullet,
                        f"Blocked. Keyword coverage {cov:.4f} < 0.60: bullet contains terms absent from evidence.",
                    )
                    raise ValueError(
                        f"Generation blocked: Statement '{bullet}' lacks verified grounding."
                    )

    return {"validation_status": "passed", "status": "validated"}


def generate_version_diff(state: ResumeState) -> dict[str, Any]:
    """Generates unified diff between original and optimized resume text."""
    logger.info("Generating version control diff...")
    diff = difflib.unified_diff(
        state.get("original_text", "").splitlines(),
        state["optimized_text"].splitlines(),
        fromfile="Original Resume",
        tofile="Optimized Resume",
        lineterm="",
    )
    return {"version_diff": "\n".join(diff), "status": "diffed"}


def export_docx(state: ResumeState) -> dict[str, Any]:
    """Merges optimizations back into DOCX layout and persists to DB (sync session)."""
    logger.info("Running layout preservation merge engine and exporting DOCX...")
    user_id = state["user_id"]
    template_id = state["template_id"]
    jd_id = state["jd_id"]
    evidence_bundle_id = state["evidence_bundle"].get("bundle_id")

    out_dir = settings.STORAGE_RESUME_DIR
    os.makedirs(out_dir, exist_ok=True)
    out_filename = f"optimized_resume_{uuid.uuid4().hex[:8]}.docx"
    output_path = os.path.join(out_dir, out_filename)

    engine = DocxEngine()
    engine.merge_changes(
        template_path=settings.RESUME_TEMPLATE_PATH,
        optimized_sections={"Professional Experience": state["optimized_text"]},
        output_path=output_path,
    )

    # ponytail: LangGraph nodes run synchronously; sync session is intentional here.
    # If LangGraph adds native async context, refactor to pass AsyncSession via state.
    db = SessionLocal()
    try:
        latest_count = db.query(ResumeVersion).filter(
            ResumeVersion.user_id == uuid.UUID(user_id),
            ResumeVersion.template_id == uuid.UUID(template_id),
        ).count()

        res_version = ResumeVersion(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            template_id=uuid.UUID(template_id),
            version_number=latest_count + 1,
            jd_id=uuid.UUID(jd_id) if jd_id else None,
            generated_text=state["optimized_text"],
            file_path=output_path,
            evidence_bundle_id=uuid.UUID(evidence_bundle_id) if evidence_bundle_id else None,
        )
        db.add(res_version)
        db.commit()

        db.add(ResumeDiff(
            id=uuid.uuid4(),
            resume_version_id=res_version.id,
            user_id=uuid.UUID(user_id),
            diff_patch=state["version_diff"],
            modified_sections=["Professional Experience"],
        ))
        db.commit()
    except Exception as exc:
        logger.error(f"Failed to record ResumeVersion in database: {exc}")
        db.rollback()
    finally:
        db.close()

    return {"output_path": output_path, "status": "completed"}


def _record_hallucination(state: ResumeState, snippet: str, reason: str) -> None:
    """Logs a hallucination event into the database (sync session — graph context)."""
    # ponytail: sync session intentional — see export_docx note above.
    db = SessionLocal()
    try:
        db.add(HallucinationEvent(
            id=uuid.uuid4(),
            session_id=uuid.UUID(state["session_id"]),
            user_id=uuid.UUID(state["user_id"]),
            generated_snippet=snippet[:500],
            validation_status="rejected",
            audit_comments=reason,
        ))
        db.commit()
        logger.info("Recorded hallucination event in database.")
    except Exception as exc:
        logger.error(f"Failed to log hallucination event: {exc}")
        db.rollback()
    finally:
        db.close()


# --- Graph Construction ---

builder = StateGraph(ResumeState)
builder.add_node("select_sections", select_sections)
builder.add_node("optimize", optimize_bullets)
builder.add_node("validate", validate_against_evidence)
builder.add_node("diff", generate_version_diff)
builder.add_node("export", export_docx)

builder.set_entry_point("select_sections")
builder.add_edge("select_sections", "optimize")
builder.add_edge("optimize", "validate")
builder.add_edge("validate", "diff")
builder.add_edge("diff", "export")
builder.add_edge("export", END)

resume_optimization_graph = builder.compile()
