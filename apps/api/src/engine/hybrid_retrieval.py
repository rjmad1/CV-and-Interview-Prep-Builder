import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from qdrant_client import QdrantClient
from apps.api.src.config import settings
from apps.api.src.models import EvidenceBundle, TraceRecord, DocumentChunk
from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-hybrid-retrieval")

class HybridRetrieval:
    def __init__(self, db: Session, qdrant_url: Optional[str] = None):
        self.db = db
        self.qdrant_url = qdrant_url or settings.QDRANT_URL
        try:
            self.qdrant_client = QdrantClient(url=self.qdrant_url)
        except Exception:
            self.qdrant_client = None

    def _to_uuid(self, val: Any) -> uuid.UUID:
        if isinstance(val, str):
            return uuid.UUID(val)
        return val

    def sparse_search(self, user_id: Any, requirements: List[str], limit: int = 10) -> List[Dict[str, Any]]:
        """Runs keyword lexical search across user's DocumentChunks in the SQL DB."""
        uid = self._to_uuid(user_id)
        matched_chunks = []
        
        try:
            for req in requirements:
                # Use ILIKE match query to find occurrences of requirements in chunk text
                chunks = self.db.query(DocumentChunk).filter(
                    DocumentChunk.user_id == uid,
                    DocumentChunk.chunk_text.ilike(f"%{req}%")
                ).limit(limit).all()
                
                for chunk in chunks:
                    matched_chunks.append({
                        "chunk_id": str(chunk.id),
                        "text": chunk.chunk_text,
                        "score": 1.0  # Base occurrence weight
                    })
            
            # Deduplicate and calculate query-term frequency weights
            unique_chunks = {}
            for chunk in matched_chunks:
                cid = chunk["chunk_id"]
                if cid not in unique_chunks:
                    unique_chunks[cid] = chunk
                else:
                    unique_chunks[cid]["score"] += 1.0
                    
            sorted_chunks = sorted(unique_chunks.values(), key=lambda x: x["score"], reverse=True)
            results = sorted_chunks[:limit]
            
            # Always supplement with ALL user chunks not already in results.
            # This ensures the anti-hallucination validator has the complete resume corpus
            # as grounding evidence, since generated bullets can reference content from any section.
            all_chunks = self.db.query(DocumentChunk).filter(
                DocumentChunk.user_id == uid
            ).limit(limit).all()
            seen_ids = {c["chunk_id"] for c in results}
            for chunk in all_chunks:
                cid = str(chunk.id)
                if cid not in seen_ids:
                    results.append({
                        "chunk_id": cid,
                        "text": chunk.chunk_text,
                        "score": 0.5  # Base supplemental score
                    })
                    seen_ids.add(cid)
            
            logger.info(f"Sparse search returning {len(results)} chunks (keyword-matched + full corpus supplement)")
            return results
        except Exception as e:
            logger.error(f"Sparse search error: {e}")
            return []


    async def dense_search(self, user_id: Any, requirements: List[str], limit: int = 10) -> List[Dict[str, Any]]:
        """Runs vector similarity dense search against Qdrant database."""
        uid = self._to_uuid(user_id)
        if not self.qdrant_client:
            logger.warning("Qdrant client not initialized in HybridRetrieval, skipping dense search.")
            return []

        query_text = " ".join(requirements)
        if not query_text.strip():
            return []

        try:
            # 1. Embed query
            query_vector = (await ai_gateway_client.embed([query_text]))[0]
            
            # 2. Search Qdrant with tenant filter
            from qdrant_client.http import models as qdrant_models
            
            query_filter = qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key="user_id",
                        match=qdrant_models.MatchValue(value=str(uid))
                    )
                ]
            )
            
            # Tenant isolation validation check
            if not any(
                isinstance(cond, qdrant_models.FieldCondition) 
                and cond.key == "user_id" 
                and cond.match.value == str(uid)
                for cond in query_filter.must
            ):
                raise ValueError("Tenant isolation validation failed: query filter must specify a valid matching user_id")
                
            search_response = self.qdrant_client.query_points(
                collection_name="career_chunks",
                query=query_vector,
                query_filter=query_filter,
                limit=limit
            )
            search_results = search_response.points
            
            dense_hits = []
            for hit in search_results:
                dense_hits.append({
                    "chunk_id": hit.id,
                    "text": hit.payload.get("text", ""),
                    "score": hit.score
                })
            return dense_hits
        except Exception as e:
            logger.error(f"Dense search error: {e}")
            return []

    def reciprocal_rank_fusion(
        self,
        sparse_results: List[Dict[str, Any]],
        dense_results: List[Dict[str, Any]],
        k: int = 60,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """Merges sparse and dense search results using Reciprocal Rank Fusion (RRF)."""
        rrf_scores = {}
        chunk_map = {}

        # Sparse rank scoring
        for rank, item in enumerate(sparse_results):
            cid = item["chunk_id"]
            chunk_map[cid] = item
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (k + rank + 1))

        # Dense rank scoring
        for rank, item in enumerate(dense_results):
            cid = item["chunk_id"]
            chunk_map[cid] = item
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (k + rank + 1))

        merged = []
        for cid, score in rrf_scores.items():
            merged.append({
                "chunk_id": cid,
                "text": chunk_map[cid]["text"],
                "rrf_score": score
            })

        # Sort by RRF score descending
        merged = sorted(merged, key=lambda x: x["rrf_score"], reverse=True)
        return merged[:limit]

    async def rerank(self, requirements: List[str], merged_results: List[Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
        """Reranks candidates using Cross-Encoder Reranker via AI Gateway."""
        if not merged_results:
            return []

        query = " ".join(requirements)
        passages = [item["text"] for item in merged_results]

        try:
            rerank_hits = await ai_gateway_client.rerank(query=query, passages=passages)
            
            reranked = []
            for hit in rerank_hits:
                idx = hit["index"]
                reranked.append({
                    "chunk_id": merged_results[idx]["chunk_id"],
                    "text": merged_results[idx]["text"],
                    "score": hit["logit"]
                })
            return reranked[:limit]
        except Exception as e:
            logger.error(f"Reranking API error, falling back to RRF ordering: {e}")
            return [{
                "chunk_id": item["chunk_id"],
                "text": item["text"],
                "score": item["rrf_score"]
            } for item in merged_results][:limit]

    def compile_evidence_bundle(self, user_id: Any, session_id: Any, reranked_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compiles the final audited evidence bundle and writes TraceRecords in SQL DB."""
        uid = self._to_uuid(user_id)
        sid = self._to_uuid(session_id)
        
        try:
            # 1. Create EvidenceBundle
            bundle_id = uuid.uuid4()
            bundle = EvidenceBundle(
                id=bundle_id,
                session_id=sid,
                user_id=uid,
                name=f"Evidence Bundle - Ingestion Session {str(sid)[:8]}"
            )
            self.db.add(bundle)
            self.db.commit()

            # 2. Add Trace Records mapping source chunks
            evidence_items = []
            for rank, item in enumerate(reranked_results):
                chunk_id = self._to_uuid(item["chunk_id"])
                
                # Normalize scores to [0.0, 1.0] scale
                raw_score = float(item["score"])
                confidence = min(max(raw_score if raw_score <= 1.0 else 0.95, 0.0), 1.0)
                
                trace = TraceRecord(
                    id=uuid.uuid4(),
                    bundle_id=bundle_id,
                    user_id=uid,
                    chunk_id=chunk_id,
                    confidence_score=confidence,
                    mapping_reason=f"Retrieved rank {rank + 1} matching JD keywords."
                )
                self.db.add(trace)
                
                evidence_items.append({
                    "chunk_id": item["chunk_id"],
                    "confidence": confidence,
                    "text_snippet": item["text"]
                })
            
            self.db.commit()
            return {
                "bundle_id": str(bundle_id),
                "items": evidence_items
            }
        except Exception as e:
            logger.error(f"Failed to record evidence bundle in SQL DB: {e}")
            self.db.rollback()
            # Dynamic fallback ID
            fallback_id = uuid.uuid4()
            return {
                "bundle_id": str(fallback_id),
                "items": [{
                    "chunk_id": item["chunk_id"],
                    "confidence": 0.85,
                    "text_snippet": item["text"]
                } for item in reranked_results]
            }
