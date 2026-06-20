import json
import logging
from typing import Any

from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-orchestration-agent")

class OrchestrationAgent:
    def __init__(self):
        pass

    async def analyze_request(self, title: str, description: str, request_type: str, url: str = None, screen_name: str = None) -> dict[str, Any]:
        """
        Analyzes a developer request (feature/bug) using NVIDIA NIM LLM.
        Falls back to a structured deterministic analysis in mock mode.
        """
        from apps.api.src.config import settings
        is_mock = settings.AI_GATEWAY_MODE == "mock" or not settings.NVIDIA_API_KEY or settings.NVIDIA_API_KEY == "mock_nvidia_nim_development_key"

        if is_mock:
            return self._generate_mock_analysis(title, description, request_type, url, screen_name)

        # Call active AI Gateway NIM
        system_prompt = (
            "You are an expert Principal Software Architect and DevOps Engineer.\n"
            "Analyze the developer's feature request or bug report and output a JSON object with the following schema:\n"
            "{\n"
            "  \"request_type\": \"feature\" | \"bug\" | \"ux\" | \"tech_debt\" | \"performance\" | \"security\",\n"
            "  \"priority\": \"low\" | \"medium\" | \"high\" | \"critical\",\n"
            "  \"impact_assessment\": \"detailed explanation\",\n"
            "  \"effort_estimate\": \"effort estimation\",\n"
            "  \"tasks\": [\n"
            "    {\n"
            "      \"title\": \"task title\",\n"
            "      \"description\": \"task details\",\n"
            "      \"affected_layer\": \"frontend\" | \"backend\" | \"database\" | \"api_contract\",\n"
            "      \"file_path\": \"suggested relative path in repo\"\n"
            "    }\n"
            "  ]\n"
            "}\n"
            "Provide ONLY valid JSON. Do not include markdown formatting or backticks, just the raw JSON text."
        )

        user_content = f"Title: {title}\nDescription: {description}\nSubmitted Category: {request_type}\nURL: {url or 'N/A'}\nScreen: {screen_name or 'N/A'}"
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        try:
            raw_response = await ai_gateway_client.generate(
                model=settings.MODEL_JD_ANALYSIS,
                messages=messages,
                temperature=0.1,
                max_tokens=1024
            )
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned.replace("```json", "", 1)
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()

            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Failed to analyze request with NIM: {e}. Falling back to mock generator.")
            return self._generate_mock_analysis(title, description, request_type, url, screen_name)

    def _generate_mock_analysis(self, title: str, description: str, request_type: str, url: str = None, screen_name: str = None) -> dict[str, Any]:
        """Generates a high-fidelity mock analysis for the request."""
        desc_lower = description.lower()
        title_lower = title.lower()

        # Determine type
        req_type = request_type.lower()
        if "security" in desc_lower or "auth" in desc_lower or "bypass" in desc_lower:
            req_type = "security"
        elif "slow" in desc_lower or "perf" in desc_lower or "latency" in desc_lower:
            req_type = "performance"
        elif "bug" in desc_lower or "fail" in desc_lower or "error" in desc_lower or "crash" in desc_lower:
            req_type = "bug"
        elif "align" in desc_lower or "ui" in desc_lower or "color" in desc_lower or "button" in desc_lower:
            req_type = "ux"
        elif req_type not in ["feature", "bug", "ux", "tech_debt", "performance", "security"]:
            req_type = "feature"

        # Determine priority, impact, effort and tasks
        if req_type == "security":
            priority = "critical"
            impact = "High security risk: potential data exposure or unauthorized bypass of access controls."
            effort = "1 day"
            tasks = [
                {
                    "title": "Fix security vulnerability / authenticate session",
                    "description": "Remove developer bypass from route authentication and implement token checks.",
                    "affected_layer": "backend",
                    "file_path": "apps/api/src/main.py"
                },
                {
                    "title": "Create regression test for authorization rules",
                    "description": "Add a pytest suite validating that unauthorized requests are rejected.",
                    "affected_layer": "backend",
                    "file_path": "apps/api/tests/test_auth.py"
                }
            ]
        elif req_type == "performance":
            priority = "high"
            impact = "Medium-High performance block: synchronous database call or blocking IO operations on the event loop."
            effort = "3 days"
            tasks = [
                {
                    "title": "Convert database sessions to AsyncSession",
                    "description": "Refactor route handlers to execute DB queries asynchronously using SQLAlchemy's select statement.",
                    "affected_layer": "database",
                    "file_path": "apps/api/src/database.py"
                }
            ]
        elif req_type == "bug":
            priority = "medium"
            impact = "Medium functional bug: application feature is malfunctioning or throws exception."
            effort = "4 hours"
            tasks = [
                {
                    "title": "Fix logic failure in affected module",
                    "description": f"Resolve the bug reported in: {title}. Add validations for input boundary parameters.",
                    "affected_layer": "backend",
                    "file_path": "apps/api/src/main.py"
                }
            ]
        elif req_type == "ux":
            priority = "low"
            impact = "Low cosmetic enhancement: layout alignment, hover visual effect, or widget themes."
            effort = "2 hours"
            tasks = [
                {
                    "title": "Refine interface CSS styling and layout",
                    "description": "Align UI layout, adjust tailwind classes, and verify responsive displays.",
                    "affected_layer": "frontend",
                    "file_path": "apps/web/app/globals.css"
                }
            ]
        else: # feature
            priority = "medium"
            impact = "New application feature request expanding core capabilities."
            effort = "5 days"
            tasks = [
                {
                    "title": "Design and declare API contract for new feature",
                    "description": "Add REST endpoints and Pydantic models for request/response serialization.",
                    "affected_layer": "api_contract",
                    "file_path": "apps/api/src/main.py"
                },
                {
                    "title": "Implement frontend page and hooks",
                    "description": "Create a new screen in apps/web/app and add API calling query hooks.",
                    "affected_layer": "frontend",
                    "file_path": f"apps/web/app/{title.lower().replace(' ', '-')}/page.tsx"
                }
            ]

        return {
            "request_type": req_type,
            "priority": priority,
            "impact_assessment": impact,
            "effort_estimate": effort,
            "tasks": tasks
        }
