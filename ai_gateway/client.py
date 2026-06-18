import logging
import random
import httpx
from typing import List, Dict, Any
from ai_gateway.config import settings

logger = logging.getLogger("cis-ai-gateway-client")

class NIMClient:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)

    async def close(self):
        await self.client.aclose()

    def _get_headers(self, api_key: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    async def generate(self, model: str, messages: List[Dict[str, str]], temperature: float = 0.2, max_tokens: int = 1024) -> str:
        """Calls Chat Completions API on NVIDIA NIM."""
        from ai_gateway.main import nvidia_api_key_ctx, ai_gateway_mode_ctx
        mode = ai_gateway_mode_ctx.get() or settings.AI_GATEWAY_MODE
        api_key = nvidia_api_key_ctx.get() or settings.NVIDIA_API_KEY

        if mode == "mock" or not api_key:
            return self._mock_generation(model, messages)
        
        url = f"{settings.NVIDIA_BASE_URL}/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        try:
            response = await self.client.post(url, json=payload, headers=self._get_headers(api_key))
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Error calling NIM generate endpoint: {e}")
            raise RuntimeError(f"NIM generation failed: {e}")

    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Calls Embeddings API on NVIDIA NIM."""
        from ai_gateway.main import nvidia_api_key_ctx, ai_gateway_mode_ctx
        mode = ai_gateway_mode_ctx.get() or settings.AI_GATEWAY_MODE
        api_key = nvidia_api_key_ctx.get() or settings.NVIDIA_API_KEY

        if mode == "mock" or not api_key:
            # Generate deterministic mock vectors of size 1024
            return [[(i % 100) / 1000.0 for i in range(1024)] for _ in texts]

        url = f"{settings.NVIDIA_BASE_URL}/embeddings"
        payload = {
            "model": settings.MODEL_EMBEDDINGS,
            "input": texts,
            "encoding_format": "float"
        }
        try:
            response = await self.client.post(url, json=payload, headers=self._get_headers(api_key))
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]
        except Exception as e:
            logger.error(f"Error calling NIM embed endpoint: {e}")
            raise RuntimeError(f"NIM embedding failed: {e}")

    async def rerank(self, query: str, passages: List[str]) -> List[Dict[str, Any]]:
        """Calls Reranking API on NVIDIA NIM."""
        from ai_gateway.main import nvidia_api_key_ctx, ai_gateway_mode_ctx
        mode = ai_gateway_mode_ctx.get() or settings.AI_GATEWAY_MODE
        api_key = nvidia_api_key_ctx.get() or settings.NVIDIA_API_KEY

        if mode == "mock" or not api_key:
            # Mock rerank scores based on simple term overlaps
            results = []
            query_words = set(query.lower().split())
            for idx, passage in enumerate(passages):
                passage_words = set(passage.lower().split())
                overlap = len(query_words.intersection(passage_words))
                score = 0.5 + 0.5 * (overlap / max(1, len(query_words)))
                results.append({
                    "index": idx,
                    "logit": score,
                    "text": passage
                })
            return sorted(results, key=lambda x: x["logit"], reverse=True)

        url = f"{settings.NVIDIA_BASE_URL}/reranking"
        payload = {
            "model": settings.MODEL_RERANKING,
            "query": {"text": query},
            "passages": [{"text": p} for p in passages]
        }
        try:
            response = await self.client.post(url, json=payload, headers=self._get_headers(api_key))
            response.raise_for_status()
            data = response.json()
            # Parse responses to standard list of items with score and index
            results = []
            for item in data.get("rankings", []):
                results.append({
                    "index": item["index"],
                    "logit": item["score"],
                    "text": passages[item["index"]]
                })
            return results
        except Exception as e:
            logger.error(f"Error calling NIM rerank endpoint: {e}")
            raise RuntimeError(f"NIM reranking failed: {e}")

    async def classify(self, text: str) -> str:
        """Classifies document text into 'resume', 'verification', or 'achievement'."""
        system_prompt = (
            "You are a professional metadata classifier. "
            "Categorize the following text into exactly one of these categories: 'resume', 'verification', 'achievement'. "
            "Respond with only the category name, lowercase, with no punctuation."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text[:4000]}
        ]
        category = await self.generate(
            model=settings.MODEL_JD_ANALYSIS,  # Use standard smaller instruct model
            messages=messages,
            temperature=0.0,
            max_tokens=10
        )
        cleaned_cat = category.strip().lower()
        if "resume" in cleaned_cat:
            return "resume"
        elif "verification" in cleaned_cat or "cert" in cleaned_cat or "degree" in cleaned_cat:
            return "verification"
        else:
            return "achievement"

    def _mock_generation(self, model: str, messages: List[Dict[str, str]]) -> str:
        """Simulates LLM completions for common pipeline tasks."""
        full_content = "\n".join([m["content"] for m in messages]).lower()
        user_msg = messages[-1]["content"].lower() if messages else ""
        
        if "metadata classifier" in full_content or "categorize" in full_content:
            if "resume" in user_msg:
                return "resume"
            elif "verification" in user_msg or "cert" in user_msg or "degree" in user_msg or "credential" in user_msg:
                return "verification"
            else:
                return "achievement"
                
        elif "expert recruiter and technical analyst" in full_content or "analyze job description" in full_content:
            if "covasant" in full_content or "solution architect" in full_content:
                return """
                {
                  "company": "Covasant",
                  "title": "Solution Architect Data & AI",
                  "extracted_skills": ["Solution Architecture", "Data Architecture", "Enterprise Integration", "MDM", "Neo4j", "RDF/OWL", "GCP/Azure", "LLM Orchestration", "Vector Databases", "Data Governance"],
                  "required_keywords": ["Golden Record", "Universal Connectivity", "Neo4j", "GCP Professional Architect", "LangGraph", "Vector Databases"],
                  "gap_analysis": [
                    {"skill": "Solution Architecture", "importance": "high", "status": "matched"},
                    {"skill": "Data Architecture", "importance": "high", "status": "matched"},
                    {"skill": "Enterprise Integration", "importance": "high", "status": "matched"},
                    {"skill": "MDM", "importance": "high", "status": "matched"},
                    {"skill": "Neo4j", "importance": "medium", "status": "missing"},
                    {"skill": "RDF/OWL", "importance": "medium", "status": "missing"},
                    {"skill": "GCP/Azure", "importance": "medium", "status": "matched"},
                    {"skill": "LLM Orchestration", "importance": "medium", "status": "matched"},
                    {"skill": "Vector Databases", "importance": "medium", "status": "matched"},
                    {"skill": "Data Governance", "importance": "low", "status": "matched"}
                  ]
                }
                """
            return """
            {
              "company": "NVIDIA",
              "title": "Senior AI Architect",
              "extracted_skills": ["Python", "FastAPI", "PostgreSQL", "React", "Docker", "Kubernetes", "Next.js"],
              "required_keywords": ["Cloud Architecture", "Next.js", "CI/CD Pipeline", "Microservices", "Row-Level Security"],
              "gap_analysis": [
                {"skill": "Python", "importance": "high", "status": "matched"},
                {"skill": "FastAPI", "importance": "high", "status": "matched"},
                {"skill": "PostgreSQL", "importance": "high", "status": "matched"},
                {"skill": "React", "importance": "medium", "status": "matched"},
                {"skill": "Docker", "importance": "medium", "status": "matched"},
                {"skill": "Next.js", "importance": "high", "status": "missing"},
                {"skill": "Kubernetes", "importance": "medium", "status": "missing"}
              ]
            }
            """

        elif "expert resume writer" in full_content or "optimize the professional experience" in full_content:
            if "covasant" in full_content or "solution architect" in full_content:
                return """
                - Designed and architected end-to-end enterprise integration architecture for CRM, ERP, and data lakes across Retail and Consumer Goods verticals.
                - Configured Universal Connectivity layer and managed master data management (MDM) platforms, including Oracle Supplier Hub and Hyperion DRM.
                - Devised solutions incorporating LangGraph orchestration frameworks and vector database systems to optimize enterprise data workflows.
                """
            return """
            - Engineered and maintained high-performance Python microservices utilizing FastAPI, boosting API throughput by 42%.
            - Implemented advanced PostgreSQL configurations, enforcing tenant isolation using Row-Level Security policies to protect customer data.
            - Configured automated deployment tasks using Docker containerization, reducing staging deploy times by 30%.
            """

        elif "elite interviewer" in full_content or "generate exactly 3" in full_content:
            return """
            [
              {"id": "q1", "text": "Can you describe your experience implementing Row-Level Security (RLS) in PostgreSQL, and how you verified data isolation?"},
              {"id": "q2", "text": "How have you handled scaling FastAPI applications with background tasks, particularly using Redis and Celery?"},
              {"id": "q3", "text": "Describe a scenario where you integrated Docker and Next.js. What were the caching configurations you set?"}
            ]
            """
 
        elif "interview performance coach" in full_content or "evaluate the candidate's response" in full_content:
            return """
            Excellent explanation. You should mention performance benchmarks and indexing strategies to make this response stronger.
            """
        
        elif "hiring manager grading" in full_content or "numeric readiness score" in full_content:
            return "85.0"
 
        return f"Mock response for model {model}. Enforced truth preservation and evidence-based grounding."
 
        return f"Mock response for model {model}. Enforced truth preservation and evidence-based grounding."
