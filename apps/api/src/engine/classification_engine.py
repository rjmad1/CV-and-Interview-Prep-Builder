import re
import logging
from typing import Optional
from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-classification-engine")

class ClassificationEngine:
    def __init__(self):
        # Setup regex lists for fast heuristic fallback
        self.resume_patterns = [
            r"\b(cv|resume|curriculum\s+vitae)\b",
            r"\b(work|professional|employment)\s+experience\b",
            r"\bcareer\s+(summary|history|objective)\b",
            r"\bkey\s+skills\b",
            r"\beducation\s+&\s+experience\b"
        ]
        self.verification_patterns = [
            r"\b(certificate|certification|certified|credential)\b",
            r"\b(degree|diploma|transcript|official\s+record)\b",
            r"\b(audit\s+trail|background\s+check|verification\s+letter)\b",
            r"\b(licence|license)\s+number\b"
        ]
        self.achievement_patterns = [
            r"\b(award|honor|prize|medal|recognition)\b",
            r"\b(patent|publication|presentation|press\s+release)\b",
            r"\b(achievement|accomplishment|success\s+story)\b",
            r"\b(key\s+project|major\s+contribution)\b"
        ]

    def classify_heuristics(self, text: str) -> Optional[str]:
        """Classifies text based on simple rule-based keyword occurrences."""
        text_lower = text.lower()
        
        resume_score = sum(1 for pat in self.resume_patterns if re.search(pat, text_lower))
        verification_score = sum(1 for pat in self.verification_patterns if re.search(pat, text_lower))
        achievement_score = sum(1 for pat in self.achievement_patterns if re.search(pat, text_lower))
        
        scores = {
            "resume": resume_score,
            "verification": verification_score,
            "achievement": achievement_score
        }
        
        max_class, max_score = max(scores.items(), key=lambda x: x[1])
        if max_score > 0:
            logger.info(f"Heuristics hit: classified document as '{max_class}' with score {max_score}")
            return max_class
            
        return None

    async def classify(self, text: str) -> str:
        """
        Classifies document text.
        Checks heuristics first; if ambiguous, uses AI Gateway NIM classification.
        """
        if not text:
            return "resume"  # Default fallback
            
        # 1. Try heuristics
        heuristic_category = self.classify_heuristics(text)
        if heuristic_category:
            return heuristic_category
            
        # 2. Call AI Gateway
        try:
            logger.info("Heuristics ambiguous. Invoking LLM classification via AI Gateway...")
            category = await ai_gateway_client.classify(text)
            cleaned = category.strip().lower()
            
            # Map/validate response to expected tokens
            if "resume" in cleaned:
                return "resume"
            elif "verification" in cleaned or "cert" in cleaned or "degree" in cleaned:
                return "verification"
            elif "achievement" in cleaned or "award" in cleaned or "project" in cleaned:
                return "achievement"
            
            # If AI returns unknown category, fallback to heuristics choice or default
            return cleaned if cleaned in ["resume", "verification", "achievement"] else "resume"
        except Exception as e:
            logger.error(f"AI Gateway classification failed, falling back to 'resume': {e}")
            return "resume"
