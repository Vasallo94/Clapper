# Docker Compose Multi-Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize all 3 services (agent, render-service, web) in Docker Compose with internal networking, eliminating `host.docker.internal` and manual service startup.

**Architecture:** Each service gets its own Dockerfile. All share the repo via bind-mount (`.:/app`). Services communicate via Docker DNS names (`render-service:3100`, `agent:2024`). Named volumes isolate `node_modules` to prevent host/container conflicts. Healthchecks + `depends_on` guarantee startup order.

**Tech Stack:** Docker Compose v2, Node 22 (render-service, web), Python 3.12 (agent), Chromium headless (render-service)

**Spec:** `docs/superpowers/specs/2026-05-11-docker-compose-multiservice-design.md`

---

## File Map

| File                                 | Action  | Responsibility                                       |
| ------------------------------------ | ------- | ---------------------------------------------------- |
| `packages/render-service/Dockerfile` | Create  | Node 22 + Chromium headless + npm workspaces         |
| `packages/web/Dockerfile`            | Create  | Node 22 + Vite dev server                            |
| `docker-compose.yml`                 | Rewrite | 3 services, healthchecks, depends_on, named volumes  |
| `.dockerignore`                      | Update  | Add `.generated/`, `.env` safety, keep what's needed |
| `Makefile`                           | Update  | Docker-based targets, native alternatives            |
| `CHANGELOG.md`                       | Update  | Entry under [Unreleased]                             |

---

### Task 1: Create render-service Dockerfile

**Files:**

- Create: `packages/render-service/Dockerfile`

- [ ] **Step 1: Create the Dockerfile**

```dockerfile
FROM node:22-slim

# Chromium headless dependencies for Remotion rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk-bridge2.0-0 libx11-xcb1 libdrm2 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libasound2 libcups2 \
    fonts-liberation curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root manifests + render-service package
COPY package.json package-lock.json ./
COPY packages/render-service/package.json packages/render-service/
# Web workspace must exist for npm ci to resolve all workspaces
COPY packages/web/package.json packages/web/

RUN npm ci

# Download Chromium for Remotion
RUN npx remotion browser ensure

EXPOSE 3100

CMD ["npm", "run", "--workspace=packages/render-service", "start"]
```

- [ ] **Step 2: Verify Dockerfile builds**

Run: `docker build -f packages/render-service/Dockerfile -t remotion-render-service .`
Expected: Build completes successfully, final image contains node_modules and Chromium.

- [ ] **Step 3: Verify render-service starts in container**

Run: `docker run --rm -v .:/app -p 3100:3100 remotion-render-service`
Expected: Console prints `Render service listening on :3100`. Hit Ctrl+C to stop.

- [ ] **Step 4: Verify healthcheck endpoint responds**

Run (in another terminal while container is running):

```bash
curl -f http://localhost:3100/api/render/jobs
```

Expected: JSON response `{"jobs":[],"total":0,"limit":20,"offset":0}` (or similar).

- [ ] **Step 5: Commit**

```bash
git add packages/render-service/Dockerfile
git commit -m "build(render-service): add Dockerfile with Chromium headless"
```

---

### Task 2: Create web Dockerfile

**Files:**

- Create: `packages/web/Dockerfile`

- [ ] **Step 1: Create the Dockerfile**

```dockerfile
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root manifests + web package
COPY package.json package-lock.json ./
COPY packages/web/package.json packages/web/
# Render-service workspace must exist for npm ci to resolve all workspaces
COPY packages/render-service/package.json packages/render-service/

RUN npm ci

EXPOSE 5173

CMD ["npx", "--workspace=packages/web", "vite", "--host", "0.0.0.0"]
```

- [ ] **Step 2: Verify Dockerfile builds**

Run: `docker build -f packages/web/Dockerfile -t remotion-web .`
Expected: Build completes successfully.

- [ ] **Step 3: Verify web starts in container**

Run: `docker run --rm -v .:/app -p 5173:5173 remotion-web`
Expected: Vite dev server starts and prints a URL. Hit Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add packages/web/Dockerfile
git commit -m "build(web): add Dockerfile for Vite dev server"
```

---

### Task 3: Rewrite docker-compose.yml

**Files:**

- Modify: `docker-compose.yml` (full rewrite, currently 16 lines)

- [ ] **Step 1: Rewrite docker-compose.yml**

Replace the entire file with:

```yaml
services:
  render-service:
    build:
      context: .
      dockerfile: packages/render-service/Dockerfile
    ports:
      - "3100:3100"
    volumes:
      - .:/app
      - render_node_modules:/app/node_modules
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100/api/render/jobs"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  agent:
    build:
      context: .
      dockerfile: packages/agent/Dockerfile
    ports:
      - "2024:2024"
    volumes:
      - .:/app
    env_file: .env
    environment:
      - PROJECT_ROOT=/app
      - RENDER_SERVICE_URL=http://render-service:3100
    depends_on:
      render-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:2024/ok"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - web_node_modules:/app/node_modules
    env_file: .env
    environment:
      - VITE_LANGGRAPH_URL=http://localhost:2024
      - VITE_RENDER_URL=http://localhost:3100
    depends_on:
      agent:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s

volumes:
  render_node_modules:
  web_node_modules:
```

- [ ] **Step 2: Validate compose file syntax**

Run: `docker compose config --quiet`
Expected: No output (exit code 0 = valid).

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "build: rewrite docker-compose with 3 services and healthchecks"
```

---

### Task 4: Update .dockerignore

**Files:**

- Modify: `.dockerignore`

- [ ] **Step 1: Update .dockerignore**

Replace the entire file with:

```
node_modules/
.git/
.generated/
packages/agent/.venv/
packages/agent/.langgraph_api/
dist/
out/
.remotion/
content/**/output.mp4
__pycache__/
*.py[cod]
*.md
!package.json
!packages/*/package.json
docs/
_project_specs/
```

Key changes:

- Added `.generated/` (render outputs, no need in build context)
- Added `*.md` exclusion (docs not needed in images) with `!package.json` exception
- Added `docs/` and `_project_specs/` explicitly
- Changed `tutorials/*/output.mp4` to `content/**/output.mp4` to match actual path

- [ ] **Step 2: Commit**

```bash
git add .dockerignore
git commit -m "build: update dockerignore for multi-service setup"
```

---

### Task 5: Update Makefile

**Files:**

- Modify: `Makefile`

- [ ] **Step 1: Update the Development section (lines 22-54)**

Replace lines 22–54 (from `dev: studio` through the end of `up:`) with:

```makefile
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
```

- [ ] **Step 2: Verify Makefile targets**

Run: `make help`
Expected: All targets are listed with descriptions. No syntax errors.

- [ ] **Step 3: Commit**

```bash
git add Makefile
git commit -m "build: update Makefile for Docker Compose multi-service"
```

---

### Task 6: Integration test — `docker compose up`

This task verifies the entire stack works end-to-end.

- [ ] **Step 1: Build all services**

Run: `docker compose build`
Expected: All 3 images build successfully. The render-service image will take longest (Chromium download).

- [ ] **Step 2: Start all services**

Run: `docker compose up -d`
Expected: All 3 services start. Check with `docker compose ps` — all should show "healthy" after their start periods.

- [ ] **Step 3: Verify render-service is reachable**

Run: `curl -f http://localhost:3100/api/render/jobs`
Expected: JSON response with jobs list.

- [ ] **Step 4: Verify agent is reachable**

Run: `curl -f http://localhost:2024/ok`
Expected: HTTP 200 response.

- [ ] **Step 5: Verify web is reachable**

Run: `curl -f http://localhost:5173`
Expected: HTML response from Vite dev server.

- [ ] **Step 6: Verify agent can reach render-service internally**

Run:

```bash
docker compose exec agent python3 -c "import httpx; print(httpx.get('http://render-service:3100/api/render/jobs').status_code)"
```

Expected: `200`

- [ ] **Step 7: Stop and clean up**

Run: `docker compose down`
Expected: All services stop cleanly.

- [ ] **Step 8: Update CHANGELOG.md**

Add under `[Unreleased]`:

```markdown
### Changed

- Rewrite docker-compose.yml with 3 services (agent, render-service, web) and healthchecks
- Update Makefile targets for Docker Compose multi-service setup
- Update .dockerignore for multi-service builds

### Added

- Dockerfile for render-service (Node 22 + Chromium headless)
- Dockerfile for web (Node 22 + Vite dev server)

### Removed

- `host.docker.internal` dependency for agent→render-service communication
```

- [ ] **Step 9: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for multi-service Docker Compose"
```

---

## Troubleshooting Notes

**If render-service healthcheck fails:** Chromium deps might be incomplete on the specific Debian version. Check `docker compose logs render-service` for missing `.so` libraries and add them to the Dockerfile `apt-get install` line.

**If agent healthcheck fails on `/ok`:** The LangGraph dev server might use a different health endpoint. Try `http://localhost:2024/threads` or `http://localhost:2024/info` instead. Check `docker compose logs agent` for the actual endpoints served.

**If `npm ci` fails in Dockerfiles:** The workspace resolution requires all workspace `package.json` files to be COPYed before `npm ci`. If a new workspace is added to the root `package.json`, its `package.json` must be added to all Dockerfiles that run `npm ci`.

**If Vite HMR doesn't work from Docker:** Vite needs `--host 0.0.0.0` (already in CMD) and the websocket port (5173) exposed. If HMR still fails, add `server.hmr.host: 'localhost'` to `packages/web/vite.config.ts`.
