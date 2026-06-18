import logging
from typing import Dict, List, Any, TypedDict
from langgraph.graph import StateGraph, END
from apps.api.src.database import SessionLocal
from apps.api.src.engine.hybrid_retrieval import HybridRetrieval

logger = logging.getLogger("cis-graph-retrieval")

class RetrievalState(TypedDict):
    user_id: str
    session_id: str
    jd_requirements: List[str]  # Skills/keywords to search for
    sparse_results: List[Dict[str, Any]]
    dense_results: List[Dict[str, Any]]
    merged_results: List[Dict[str, Any]]
    reranked_results: List[Dict[str, Any]]
    evidence_bundle: Dict[str, Any]
    status: str

# --- Node Implementations ---

def bm25_sparse_search(state: RetrievalState) -> Dict[str, Any]:
    """Runs keyword lexical search across the parsed document chunks in SQL database."""
    logger.info("Executing sparse lexical search...")
    db = SessionLocal()
    try:
        retriever = HybridRetrieval(db)
        results = retriever.sparse_search(
            user_id=state["user_id"],
            requirements=state["jd_requirements"]
        )
        return {
            "sparse_results": results
        }
    finally:
        db.close()

async def vector_dense_search(state: RetrievalState) -> Dict[str, Any]:
    """Runs vector similarity dense search against Qdrant database."""
    logger.info("Executing vector similarity search...")
    db = SessionLocal()
    try:
        retriever = HybridRetrieval(db)
        results = await retriever.dense_search(
            user_id=state["user_id"],
            requirements=state["jd_requirements"]
        )
        return {
            "dense_results": results
        }
    finally:
        db.close()

def merge_results(state: RetrievalState) -> Dict[str, Any]:
    """Merges sparse and dense search results using Reciprocal Rank Fusion (RRF)."""
    logger.info("Merging search results via RRF...")
    db = SessionLocal()
    try:
        retriever = HybridRetrieval(db)
        results = retriever.reciprocal_rank_fusion(
            sparse_results=state.get("sparse_results", []),
            dense_results=state.get("dense_results", [])
        )
        return {
            "merged_results": results,
            "status": "merged"
        }
    finally:
        db.close()

async def rerank_results(state: RetrievalState) -> Dict[str, Any]:
    """Reranks candidates using Cross-Encoder Reranker via AI Gateway."""
    logger.info("Reranking candidates...")
    db = SessionLocal()
    try:
        retriever = HybridRetrieval(db)
        results = await retriever.rerank(
            requirements=state["jd_requirements"],
            merged_results=state["merged_results"]
        )
        return {
            "reranked_results": results,
            "status": "reranked"
        }
    finally:
        db.close()

def compile_evidence_bundle(state: RetrievalState) -> Dict[str, Any]:
    """Compiles the final audited evidence bundle and traces source citations."""
    logger.info("Compiling evidence bundle with audit trails...")
    db = SessionLocal()
    try:
        retriever = HybridRetrieval(db)
        bundle = retriever.compile_evidence_bundle(
            user_id=state["user_id"],
            session_id=state["session_id"],
            reranked_results=state["reranked_results"]
        )
        return {
            "evidence_bundle": bundle,
            "status": "completed"
        }
    finally:
        db.close()

# --- Graph Construction ---

builder = StateGraph(RetrievalState)

# Add Nodes
builder.add_node("sparse_search", bm25_sparse_search)
builder.add_node("dense_search", vector_dense_search)
builder.add_node("merge", merge_results)
builder.add_node("rerank", rerank_results)
builder.add_node("compile_bundle", compile_evidence_bundle)

def start_retrieval(state: RetrievalState) -> Dict[str, Any]:
    return {"status": "retrieval_started"}

builder.add_node("start", start_retrieval)
builder.set_entry_point("start")

# Branch parallel
builder.add_conditional_edges(
    "start",
    lambda state: ["sparse_search", "dense_search"],
    {"sparse_search": "sparse_search", "dense_search": "dense_search"}
)

# Collect branches
builder.add_edge("sparse_search", "merge")
builder.add_edge("dense_search", "merge")
builder.add_edge("merge", "rerank")
builder.add_edge("rerank", "compile_bundle")
builder.add_edge("compile_bundle", END)

# Compile Graph
evidence_retrieval_graph = builder.compile()
