import json
import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from apps.api.src.config import settings
from apps.api.src.models import GapAnalysis, JobDescription, Skill, SkillRequirement
from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-jd-analyzer")

class JDAnalyzer:
    def __init__(self, db: Session):
        self.db = db
        # Get model mapping with safety fallback
        self.model_name = getattr(settings, "MODEL_JD_ANALYSIS", "meta/llama-3.1-8b-instruct")

        # Standard skill taxonomy mapping dictionary
        self.taxonomy_map = {
            "fastapi": "FastAPI",
            "fast-api": "FastAPI",
            "postgres": "PostgreSQL",
            "postgresql": "PostgreSQL",
            "react.js": "React",
            "reactjs": "React",
            "react": "React",
            "nextjs": "Next.js",
            "next.js": "Next.js",
            "docker containerization": "Docker",
            "docker": "Docker",
            "kubernetes": "Kubernetes",
            "k8s": "Kubernetes",
            "typescript": "TypeScript",
            "js": "JavaScript",
            "javascript": "JavaScript",
            "python": "Python",
            "py": "Python"
        }

    def _to_uuid(self, val: Any) -> uuid.UUID:
        if isinstance(val, str):
            return uuid.UUID(val)
        return val

    def normalize_skills(self, skills: list[str]) -> list[str]:
        """Standardizes raw extracted skills against the taxonomy map."""
        normalized = []
        for skill in skills:
            clean = skill.lower().strip()
            normalized.append(self.taxonomy_map.get(clean, skill.strip()))
        return list(set(normalized))

    async def analyze_job_description(self, jd_text: str) -> dict[str, Any]:
        """Calls the AI Gateway LLM to parse and extract structured requirements from raw text."""
        system_prompt = (
            "You are an expert recruiter and technical analyst. Parse the job description text and extract:\n"
            "1. Company Name\n"
            "2. Job Title\n"
            "3. List of key technical skills needed.\n"
            "4. List of required key phrases/keywords (e.g. 'Cloud Architecture', 'CI/CD').\n"
            "Output a valid JSON object matching this schema:\n"
            '{"company": "string", "title": "string", "extracted_skills": ["string"], "required_keywords": ["string"]}'
        )

        try:
            response_text = await ai_gateway_client.generate(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": jd_text}
                ],
                temperature=0.0
            )

            # Remove Markdown wrapping if any
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)

            return {
                "company": data.get("company", "Target Company"),
                "title": data.get("title", "Software Engineer"),
                "extracted_skills": data.get("extracted_skills", []),
                "required_keywords": data.get("required_keywords", [])
            }
        except Exception as e:
            logger.error(f"LLM Job Description parsing failed: {e}")
            # Fallback values
            return {
                "company": "Target Company",
                "title": "Software Engineer",
                "extracted_skills": ["Python", "FastAPI", "PostgreSQL", "React", "Docker"],
                "required_keywords": ["Cloud Architecture", "CI/CD Pipeline"]
            }

    def perform_gap_analysis(self, user_id: Any, extracted_skills: list[str], required_keywords: list[str]) -> dict[str, Any]:
        """Compares required skills against user's skills and computes compatibility score."""
        uid = self._to_uuid(user_id)

        try:
            # Query user's registered skills in SQL DB
            user_skills = self.db.query(Skill).filter(Skill.user_id == uid).all()
            user_skill_names = {s.name.lower(): s for s in user_skills}

            gaps = []
            matched_count = 0

            # List of core skills that weigh heavier in scoring
            core_skills = ["python", "fastapi", "postgresql", "next.js", "docker"]

            for skill in extracted_skills:
                lower_name = skill.lower().strip()
                importance = "high" if lower_name in core_skills else "medium"

                if lower_name in user_skill_names:
                    matched_count += 1
                    gaps.append({
                        "skill": skill,
                        "importance": importance,
                        "status": "Matched"
                    })
                else:
                    gaps.append({
                        "skill": skill,
                        "importance": importance,
                        "status": "Missing"
                    })

            # Simple score representation
            score = (matched_count / len(extracted_skills) * 100.0) if extracted_skills else 100.0
            return {
                "gap_analysis": gaps,
                "score": round(score, 2)
            }
        except Exception as e:
            logger.error(f"Gap analysis calculation error: {e}")
            return {
                "gap_analysis": [{"skill": s, "importance": "medium", "status": "Missing"} for s in extracted_skills],
                "score": 0.0
            }

    def persist_analysis_results(
        self,
        user_id: Any,
        jd_id: Any,
        company: str,
        title: str,
        raw_text: str,
        extracted_skills: list[str],
        required_keywords: list[str],
        gap_analysis: list[dict[str, Any]]
    ) -> None:
        """Persists the job description, skill requirements, and gap analysis items to SQL database."""
        uid = self._to_uuid(user_id)
        jid = self._to_uuid(jd_id)

        try:
            # 1. Create JobDescription record
            jd = JobDescription(
                id=jid,
                user_id=uid,
                company=company,
                title=title,
                raw_text=raw_text
            )
            self.db.add(jd)
            self.db.commit()

            # 2. Add Skill Requirements
            for skill in extracted_skills:
                lower_skill = skill.lower().strip()
                importance = "high" if lower_skill in ["python", "fastapi", "postgresql"] else "medium"
                req = SkillRequirement(
                    id=uuid.uuid4(),
                    jd_id=jid,
                    skill_name=skill,
                    importance=importance
                )
                self.db.add(req)

            # 3. Add Gap Analysis items
            for item in gap_analysis:
                gap = GapAnalysis(
                    id=uuid.uuid4(),
                    jd_id=jid,
                    user_id=uid,
                    skill_name=item["skill"],
                    importance=item["importance"],
                    match_status=item["status"].lower()
                )
                self.db.add(gap)

            self.db.commit()
            logger.info(f"Persisted Job Description {jid} and associated requirements to SQL DB.")
        except Exception as e:
            logger.error(f"Failed to persist JD analysis: {e}")
            self.db.rollback()
            raise e
