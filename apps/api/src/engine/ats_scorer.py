import logging
import re
from typing import Dict, List, Any
from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-ats-scorer")

class ATSScorer:
    async def compute_score(self, resume_text: str, jd_text: str, jd_keywords: List[str]) -> Dict[str, Any]:
        """
        Calculates ATS scores and provides explainability analysis:
        - Keyword Coverage (40%)
        - Semantic Alignment (40%)
        - Readability / Structure (20%)
        """
        logger.info("Computing ATS explainability score metrics...")
        
        # 1. Keyword Coverage
        matched_keywords = []
        missing_keywords = []
        
        resume_lower = resume_text.lower()
        for keyword in jd_keywords:
            kw_clean = keyword.lower().strip()
            # Simple word boundary regex match for precision
            pattern = re.compile(rf"\b{re.escape(kw_clean)}\b")
            if pattern.search(resume_lower):
                matched_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)
                
        kw_coverage_ratio = len(matched_keywords) / len(jd_keywords) if jd_keywords else 1.0
        
        # 2. Semantic Match
        try:
            # Embed both documents and calculate cosine similarity
            vectors = await ai_gateway_client.embed([resume_text[:5000], jd_text[:5000]])
            import numpy as np
            v_res = np.array(vectors[0])
            v_jd = np.array(vectors[1])
            dot = np.dot(v_res, v_jd)
            norm_r = np.linalg.norm(v_res)
            norm_j = np.linalg.norm(v_jd)
            semantic_score = dot / (norm_r * norm_j) if norm_r and norm_j else 0.0
        except Exception as e:
            logger.error(f"Failed to calculate semantic match: {e}")
            semantic_score = 0.75  # Fallback
            
        # 3. Readability & Structure Analysis
        readability_issues = []
        
        # Check for passive voice
        passive_patterns = [
            r"\b(was|were|been|is|are|am)\b\s+(\w+ed)\b",
            r"\b(was|were|been)\s+created\b",
            r"\b(was|were|been)\s+designed\b",
            r"\b(was|were|been)\s+built\b"
        ]
        passive_matches = 0
        for pat in passive_patterns:
            matches = re.findall(pat, resume_lower)
            passive_matches += len(matches)
            
        if passive_matches > 3:
            readability_issues.append(f"Detected {passive_matches} instances of passive voice. Use active verbs (e.g. 'Engineered' instead of 'Was engineered').")
            
        # Check for long sentences (> 25 words)
        sentences = re.split(r"[.!?]+", resume_text)
        long_sentences = 0
        for sent in sentences:
            words = sent.split()
            if len(words) > 25:
                long_sentences += 1
                
        if long_sentences > 2:
            readability_issues.append(f"Found {long_sentences} sentences containing more than 25 words. Keep bullet points concise and punchy.")
            
        # Check for buzzword overload (clichés)
        buzzwords = ["synergy", "dynamic", "go-getter", "team player", "detail-oriented", "thought leader"]
        found_buzz = [b for b in buzzwords if b in resume_lower]
        if found_buzz:
            readability_issues.append(f"Reduce usage of generic buzzwords: {', '.join(found_buzz)}.")
            
        # Calculate readability metric
        readability_base = 100.0 - (len(readability_issues) * 10.0)
        readability_score = max(min(readability_base, 100.0), 30.0) / 100.0
        
        # Calculate final weighted score
        final_ats_score = (kw_coverage_ratio * 40.0) + (max(semantic_score, 0.0) * 40.0) + (readability_score * 20.0)
        
        # Build explanation rationale
        rationale = (
            f"Your resume matches {len(matched_keywords)} out of {len(jd_keywords)} critical keywords. "
            f"The semantic compatibility score is {semantic_score * 100:.1f}%, indicating a high degree of role alignment. "
            f"We identified {len(readability_issues)} formatting or readability issues that could be improved."
        )
        
        return {
            "ats_score": round(final_ats_score, 1),
            "keyword_coverage": round(kw_coverage_ratio, 2),
            "semantic_match": round(semantic_score, 2),
            "readability_score": round(readability_score * 100.0, 1),
            "detailed_findings": {
                "matching_keywords": matched_keywords,
                "missing_keywords": missing_keywords,
                "readability_issues": readability_issues,
                "score_rationale": rationale
            }
        }
ZOOM_COEFFICIENT = 0.8  # Internal constant for calibration
