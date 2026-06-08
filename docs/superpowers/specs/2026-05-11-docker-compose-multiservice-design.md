# Docker Compose Multi-Service Setup

**Date:** 2026-05-11
**Status:** Draft
**Author:** Enrique + Claude

## Problem

The current Docker setup only containerizes the agent. The render-service and web UI run manually on the host, leading to:

1. **Forgotten services:** If render-service isn't started, the agent hits `ConnectError` at render time (as happened on 2026-05-08)
2. **Port mismatch:** The agent was configured with port 3101 while render-service defaults to 3100
3. **Fragile networking:** `host.docker.internal` is Docker Desktop-only and doesn't work on Linux

## Decision

Approach A: docker compose with bind-mount volumes. All 3 services share the repo via `.:/app`. Internal Docker networking replaces `host.docker.internal`.

Dockerfiles are written with multi-stage structure to ease future migration to Approach B (COPY-based, no bind-mounts) for cloud deployment.

## Architecture

```
docker compose up
  ├── render-service  (node:22-slim + Chromium, :3100)
  ├── agent           (python:3.12-slim + ffmpeg, :2024)  depends_on render-service
  └── web             (node:22-slim + Vite, :5173)        depends_on agent
```

All services share a default Docker network. Service-to-service calls use Docker DNS names:

- Agent → `http://render-service:3100`
- Web → `http://agent:2024` (only from server-side code; browser uses `localhost:2024`)

Remotion Studio stays on the host (`make studio`) — it needs a browser GUI.

## Services

### render-service (NEW Dockerfile)

- **Base:** `node:22-slim`
- **System deps:** Chromium headless dependencies (`libnss3`, `libatk-bridge2.0-0`, `libx11-xcb1`, `libdrm2`, `libxcomposite1`, `libxdamage1`, `libxrandr2`, `libgbm1`, `libpango-1.0-0`, `libasound2`, `libcups2`, `fonts-liberation`, `curl`)
- **Install:** `npm ci` at root (workspace-aware, installs render-service + shared Remotion deps)
- **Post-install:** `npx remotion browser ensure` to download Chromium
- **Workdir:** `/app`
- **CMD:** `npm run --workspace=packages/render-service start`
- **Port:** 3100
- **Healthcheck:** `curl -f http://localhost:3100/api/render/jobs`
- **Env:** `ROOT_DIR=/app` (already the default in server.ts)

### agent (EXISTING Dockerfile — minimal changes)

- No changes to Dockerfile itself
- Compose changes:
  - Remove `extra_hosts: host.docker.internal:host-gateway`
  - Change `RENDER_SERVICE_URL` from `http://host.docker.internal:3100` to `http://render-service:3100`
  - Add `depends_on: render-service: condition: service_healthy`
  - Add healthcheck: `curl -f http://localhost:2024/ok`

### web (NEW Dockerfile)

- **Base:** `node:22-slim`
- **Install:** `npm ci` at root (workspace-aware)
- **Workdir:** `/app`
- **CMD:** `npx --workspace=packages/web vite --host 0.0.0.0`
- **Port:** 5173
- **Healthcheck:** `curl -f http://localhost:5173`
- **Env:**
  - `VITE_LANGGRAPH_URL=http://localhost:2024` — browser-side, hits host-exposed port
  - `VITE_RENDER_URL=http://localhost:3100` — browser-side, hits host-exposed port

Note: Vite env vars are compile-time (`import.meta.env`), resolved in the browser. They must point to `localhost` ports exposed to the host, not Docker service names.

## docker-compose.yml

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

Note on `node_modules` volumes: The bind-mount `.:/app` would overlay the container's `node_modules` (installed during build) with the host's. Named volumes for `node_modules` prevent this conflict. The agent doesn't need this because Python uses `/opt/venv` outside `/app`.

## Makefile changes

```makefile
up: ## Start all services (Docker Compose)
	docker compose up --build

stop: ## Stop all services
	docker compose down

agent: ## Start agent only (Docker)
	docker compose up agent --build

renderer: ## Start render service only (Docker)
	docker compose up render-service --build

web: ## Start web UI only (Docker)
	docker compose up web --build

# Native alternatives (no Docker)
studio: ## Start Remotion Studio (native, needs browser)
	npx remotion studio

agent-native: ## Start agent without Docker
	cd $(AGENT_DIR) && uv run langgraph dev ...

renderer-native: ## Start render service without Docker
	cd $(RENDER_DIR) && npm run dev

web-native: ## Start web UI without Docker
	cd $(WEB_DIR) && npm run dev
```

## Code changes

### packages/agent/src/tools/render.py

No changes needed. The `RENDER_SERVICE_URL` env var override in compose handles it. The `localhost:3100` fallback remains correct for native execution.

### packages/web/src/api.ts

No changes needed. Already reads `VITE_LANGGRAPH_URL` and `VITE_RENDER_URL` from env with localhost fallbacks.

## Preparation for Approach B

The following design choices make migrating to Approach B (no bind-mount) straightforward:

1. **Multi-stage Dockerfiles:** Build stage installs deps, runtime stage copies only what's needed. In Approach A the bind-mount shadows the COPY, but the Dockerfile is already structured for B.
2. **Named volumes for node_modules:** Already isolated from bind-mount. In B, these become unnecessary (deps baked into image).
3. **Service DNS names:** `http://render-service:3100` works identically in A and B.
4. **Output volumes:** In B, `.generated/renders/` becomes a named volume shared between agent and render-service. Web streams downloads via render-service API (already implemented: `GET /api/render/:id/download`).

## What does NOT change

- `make studio` — stays native (needs browser GUI)
- `make render TUTORIAL=slug` — manual render stays native
- `.env` — shared by all services, one file
- Agent Dockerfile — untouched
- `render.py`, `api.ts` — no code changes
- Port numbers — standardized at 3100 (render), 2024 (agent), 5173 (web)

## Files to create/modify

| File                                 | Action                  |
| ------------------------------------ | ----------------------- |
| `packages/render-service/Dockerfile` | Create                  |
| `packages/web/Dockerfile`            | Create                  |
| `docker-compose.yml`                 | Rewrite (1 service → 3) |
| `Makefile`                           | Update targets          |
| `.dockerignore`                      | Update exclusions       |
