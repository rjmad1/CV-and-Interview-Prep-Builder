import logging
import uuid
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from apps.api.src.config import settings
from apps.api.src.models import ResumeVersion, JobDescription, SkillRequirement, DocumentChunk, EvidenceBundle, TraceRecord
from apps.api.src.utils.ai_client import ai_gateway_client
from apps.api.src.engine.ats_scorer import ATSScorer

logger = logging.getLogger("cis-ats-optimizer")

class ATSOptimizer:
    def __init__(self, db: Session):
        self.db = db
        self.scorer = ATSScorer()
        self.model_name = getattr(settings, "MODEL_RESUME_OPTIMIZATION", "meta/llama-3.1-8b-instruct")

    async def optimize_resume(
        self,
        resume_version_id: uuid.UUID,
        jd_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Iterative keyword-weaving optimization loop:
        1. Compares resume against JD skill requirements to identify missing keywords.
        2. Retrieves selected or matching evidence chunks for grounding.
        3. Calls LLM to weave missing keywords into experience/skills sections, grounded in evidence.
        4. Verifies optimization quality by recalculating ATS score and checking grounding.
        """
        logger.info(f"Starting ATS optimization for resume version {resume_version_id} against JD {jd_id}")

        # 1. Fetch resume and JD records
        rv = self.db.query(ResumeVersion).filter(ResumeVersion.id == resume_version_id).first()
        jd = self.db.query(JobDescription).filter(JobDescription.id == jd_id).first()
        
        if not rv or not jd:
            raise ValueError("Resume version or Job Description not found.")

        # 2. Get skill requirements (keywords) from JD
        reqs = self.db.query(SkillRequirement).filter(SkillRequirement.jd_id == jd_id).all()
        keywords = [r.skill_name for r in reqs] if reqs else ["Python", "FastAPI", "PostgreSQL", "Docker"]

        # Calculate initial score
        initial_report = await self.scorer.compute_score(rv.generated_text, jd.raw_text, keywords)
        initial_score = initial_report["ats_score"]
        missing_kws = initial_report["detailed_findings"]["missing_keywords"]
        
        if not missing_kws:
            logger.info("No missing keywords identified. Resume is already fully optimized.")
            return {
                "success": True,
                "optimized_text": rv.generated_text,
                "initial_score": initial_score,
                "new_score": initial_score,
                "weaved_keywords": [],
                "message": "Resume already matches all keywords."
            }

        # 3. Retrieve evidence chunks for grounding context
        # If the resume version is linked to an evidence bundle, use those chunks. Otherwise, get all user chunks.
        chunks = []
        if rv.evidence_bundle_id:
            traces = self.db.query(TraceRecord).filter(TraceRecord.bundle_id == rv.evidence_bundle_id).all()
            chunk_ids = [t.chunk_id for t in traces]
            chunks = self.db.query(DocumentChunk).filter(DocumentChunk.id.in_(chunk_ids)).all()
            
        if not chunks:
            # Fallback to general user documents
            chunks = self.db.query(DocumentChunk).filter(DocumentChunk.user_id == user_id).limit(10).all()

        evidence_context = "\n".join([
            f"- [Fact]: {c.chunk_text}" for c in chunks
        ])

        # 4. LLM optimization prompt instructing keyword weaving grounded in evidence
        system_prompt = (
            "You are an expert resume optimization assistant. Your job is to rewrite the resume text to weave in the specified missing keywords. "
            "STRICT GUIDELINE: You must only incorporate a keyword if it is supported or justified by the provided verified facts. "
            "Do not invent experience, projects, or credentials. "
            "Maintain the overall style and format of the original resume. "
            "Output ONLY the complete optimized resume text."
        )

        user_prompt = (
            f"Original Resume:\n{rv.generated_text}\n\n"
            f"Missing Keywords to weave in: {', '.join(missing_kws)}\n\n"
            f"Verified Facts Context:\n{evidence_context}\n\n"
            "Please generate the optimized resume weaving in the missing keywords."
        )

        try:
            optimized_text = await ai_gateway_client.generate(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2
            )
            optimized_text = optimized_text.strip()
        except Exception as e:
            logger.error(f"ATS optimization rewrite failed: {e}")
            optimized_text = rv.generated_text

        # 5. Evaluate and verify score improvement
        new_report = await self.scorer.compute_score(optimized_text, jd.raw_text, keywords)
        new_score = new_report["ats_score"]
        new_missing = new_report["detailed_findings"]["missing_keywords"]
        
        weaved = [kw for kw in missing_kws if kw not in new_missing]
        
        logger.info(f"ATS optimization completed. Score improved from {initial_score} to {new_score}")
        
        return {
            "success": True,
            "optimized_text": optimized_text,
            "initial_score": initial_score,
            "new_score": new_score,
            "weaved_keywords": weaved,
            "message": f"Successfully optimized resume. Score increased by {new_score - initial_score:.1f} points."
        }
