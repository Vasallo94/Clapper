.PHONY: help dev studio up stop agent renderer web logs agent-logs agent-shell \
       agent-native renderer-native web-native \
       render validate catalog voiceover sound \
       lint typecheck check test test-visual test-visual-update \
       install install-all browser-ensure clean

# ─── Config ──────────────────────────────────────────────────
SHELL       := /bin/bash
AGENT_DIR   := packages/agent
RENDER_DIR  := packages/render-service
WEB_DIR     := packages/web
AGENT_PORT  := 2024
RENDER_PORT := 3100

# Tutorial slug — override with: make render TUTORIAL=my-slug
TUTORIAL    ?= $(shell ls -1 content/tutorials/ 2>/dev/null | head -1)

# ─── Help ────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ─────────────────────────────────────────────
dev: studio ## Alias for studio

studio: ## Start Remotion Studio (native, needs browser)
	npm run dev

up: ## Start all services (Docker Compose)
	docker compose up --build

stop: ## Stop all services
	docker compose down

agent: ## Start LangGraph agent (Docker)
	docker compose up agent --build

renderer: ## Start render service (Docker)
	docker compose up render-service --build

web: ## Start web UI (Docker)
	docker compose up web --build

logs: ## Tail all service logs
	docker compose logs -f

agent-logs: ## Tail agent container logs
	docker compose logs -f agent

agent-shell: ## Open shell in agent container
	docker compose exec agent bash

# ─── Native (no Docker) ─────────────────────────────────────
agent-native: ## Start LangGraph agent (native, no Docker)
	cd $(AGENT_DIR) && uv run langgraph dev --config langgraph.json \
	    --port $(AGENT_PORT) --allow-blocking

renderer-native: ## Start render service (native, no Docker)
	cd $(RENDER_DIR) && npm run dev

web-native: ## Start web UI (native, no Docker)
	cd $(WEB_DIR) && npm run dev

# ─── Video pipeline ─────────────────────────────────────────
render: ## Render tutorial to MP4 (TUTORIAL=slug)
	@test -n "$(TUTORIAL)" || { echo "Usage: make render TUTORIAL=<slug>"; exit 1; }
	npx tsx scripts/render.ts content/tutorials/$(TUTORIAL)/config.json

validate: ## Validate tutorial config (TUTORIAL=slug)
	@test -n "$(TUTORIAL)" || { echo "Usage: make validate TUTORIAL=<slug>"; exit 1; }
	npx tsx scripts/validate-config.ts content/tutorials/$(TUTORIAL)/config.json

catalog: ## Regenerate scene catalog
	npm run generate:catalog

voiceover: ## Generate voiceover (TUTORIAL=slug)
	@test -n "$(TUTORIAL)" || { echo "Usage: make voiceover TUTORIAL=<slug>"; exit 1; }
	npx tsx scripts/generate-voiceover.ts content/tutorials/$(TUTORIAL)/config.json

sound: ## Generate sound design (TUTORIAL=slug)
	@test -n "$(TUTORIAL)" || { echo "Usage: make sound TUTORIAL=<slug>"; exit 1; }
	npx tsx scripts/generate-sound-design.ts content/tutorials/$(TUTORIAL)/config.json

# ─── Quality ─────────────────────────────────────────────────
lint: ## Run ESLint
	npx eslint src

typecheck: ## Run TypeScript compiler check
	npx tsc --noEmit

check: lint typecheck ## Run lint + typecheck

test: ## Run all tests
	npx vitest run

test-visual: ## Run visual snapshot tests
	npm run test:visual

test-visual-update: ## Update visual snapshots
	npm run test:visual:update

# ─── Setup ───────────────────────────────────────────────────
install: ## Install root dependencies
	npm install

install-all: install ## Install all workspace dependencies (npm workspaces + agent)
	cd $(AGENT_DIR) && uv sync

browser-ensure: ## Ensure Chromium is available for Remotion
	npx remotion browser ensure

# ─── Cleanup ─────────────────────────────────────────────────
clean: ## Remove build artifacts and node_modules caches
	rm -rf dist out .remotion
	find content -name "output.mp4" -delete 2>/dev/null || true
