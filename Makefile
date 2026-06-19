.PHONY: dev api web test lint format security clean reset

# --- Development ---

dev: ## Start both API and frontend
	@echo "Starting API server..."
	cd apps/api && uvicorn apps.api.src.main:app --reload --port 8000 &
	@echo "Starting frontend dev server..."
	cd apps/web && npm run dev

api: ## Start API server only
	cd apps/api && uvicorn apps.api.src.main:app --reload --port 8000

web: ## Start frontend dev server only
	cd apps/web && npm run dev

# --- Quality Gates ---

test: ## Run all backend tests
	cd apps/api && pytest tests/ -v --tb=short

test-cov: ## Run tests with coverage report
	cd apps/api && pytest tests/ -v --cov=apps/api/src --cov-report=term-missing

lint: ## Lint backend + frontend
	cd apps/api && ruff check src/
	cd apps/web && npm run lint

format: ## Auto-format backend code
	cd apps/api && ruff format src/

typecheck: ## Type-check backend
	cd apps/api && mypy src/ --ignore-missing-imports

security: ## Security scan (bandit)
	cd apps/api && bandit -r src/ -ll -q

# --- Lifecycle ---

clean: ## Remove all __pycache__, .pyc, and build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf apps/api/.pytest_cache apps/web/.next apps/web/node_modules/.cache

reset: ## Reset database to clean state (dev only)
	curl -s -X POST http://localhost:8000/api/cleanup/reset | python -m json.tool

# --- Setup ---

install: ## Install all dependencies
	cd apps/api && pip install -e ".[dev]"
	cd apps/web && npm install

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
