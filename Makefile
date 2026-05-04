.PHONY: help dev studio agent renderer web up stop \
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
TUTORIAL    ?= $(shell ls -1 tutorials/ 2>/dev/null | head -1)

# ─── Help ────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ─────────────────────────────────────────────
dev: studio ## Alias for studio

studio: ## Start Remotion Studio (preview)
	npm run dev

agent: ## Start LangGraph agent server (port 2024)
	cd $(AGENT_DIR) && uv run langgraph dev --config langgraph.json --port $(AGENT_PORT) --allow-blocking

renderer: ## Start render service (port 3100)
	cd $(RENDER_DIR) && npm run dev

web: ## Start web UI (Vite)
	cd $(WEB_DIR) && npm run dev

up: ## Start all services (studio + agent + renderer + web)
	@echo "Starting all services… (Ctrl+C to stop)"
	@trap 'kill 0; exit 0' INT TERM; \
		$(MAKE) studio &  \
		$(MAKE) agent &   \
		$(MAKE) renderer & \
		$(MAKE) web &      \
		wait

# ─── Video pipeline ─────────────────────────────────────────
render: ## Render tutorial to MP4 (TUTORIAL=slug)
	@test -n "$(TUTORIAL)" || { echo "Usage: make render TUTORIAL=<slug>"; exit 1; }
	npx tsx scripts/render.ts tutorials/$(TUTORIAL)/config.json

validate: ## Validate tutorial config (TUTORIAL=slug)
	@test -n "$(TUTORIAL)" || { echo "Usage: make validate TUTORIAL=<slug>"; exit 1; }
	npx tsx scripts/validate-config.ts tutorials/$(TUTORIAL)/config.json

catalog: ## Regenerate scene catalog
	npm run generate:catalog

voiceover: ## Generate voiceover (TUTORIAL=slug)
	@test -n "$(TUTORIAL)" || { echo "Usage: make voiceover TUTORIAL=<slug>"; exit 1; }
	npx tsx scripts/generate-voiceover.ts tutorials/$(TUTORIAL)/config.json

sound: ## Generate sound design (TUTORIAL=slug)
	@test -n "$(TUTORIAL)" || { echo "Usage: make sound TUTORIAL=<slug>"; exit 1; }
	npx tsx scripts/generate-sound-design.ts tutorials/$(TUTORIAL)/config.json

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

install-all: install ## Install all workspace dependencies
	cd $(RENDER_DIR) && npm install
	cd $(WEB_DIR) && npm install
	cd $(AGENT_DIR) && uv sync

browser-ensure: ## Ensure Chromium is available for Remotion
	npx remotion browser ensure

# ─── Cleanup ─────────────────────────────────────────────────
clean: ## Remove build artifacts and node_modules caches
	rm -rf dist out .remotion
	find tutorials -name "output.mp4" -delete 2>/dev/null || true
