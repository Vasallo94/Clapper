# Agent Containerization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize the LangGraph agent so it runs in Docker with predictable paths (`/app`) instead of relying on Mac-specific filesystem resolution.

**Architecture:** Single Docker container for the Python agent (packages/agent), using bind mount of the project root at `/app`. Render-service and web stay native on the host. The agent reaches render-service via `host.docker.internal:3100`.

**Tech Stack:** Docker, docker-compose, python:3.12-slim, uv, ffmpeg

---

## File Structure

| Action | Path                        | Responsibility                                         |
| ------ | --------------------------- | ------------------------------------------------------ |
| Create | `.dockerignore`             | Exclude node_modules, .git, .venv from build context   |
| Create | `packages/agent/Dockerfile` | Python 3.12 + uv + ffmpeg image for the agent          |
| Create | `docker-compose.yml`        | Orchestrate agent service with bind mount and env      |
| Modify | `Makefile`                  | Replace `agent` target with Docker, add helper targets |

---

### Task 1: Create `.dockerignore`

**Files:**

- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore` at project root**

```
node_modules/
.git/
packages/agent/.venv/
packages/agent/.langgraph_api/
packages/render-service/node_modules/
packages/web/node_modules/
dist/
out/
.remotion/
tutorials/*/output.mp4
__pycache__/
*.py[cod]
```

- [ ] **Step 2: Verify it's picked up**

Run: `docker build --check . -f packages/agent/Dockerfile 2>&1 || true`

This will fail (no Dockerfile yet) but confirms docker reads `.dockerignore` from the build context root.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "build(docker): add .dockerignore for agent containerization"
```

---

### Task 2: Create the agent Dockerfile

**Files:**

- Create: `packages/agent/Dockerfile`
- Reference: `packages/agent/pyproject.toml` (dependencies list)
- Reference: `packages/agent/uv.lock` (locked versions)

- [ ] **Step 1: Create `packages/agent/Dockerfile`**

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app/packages/agent

COPY packages/agent/pyproject.toml packages/agent/uv.lock ./
RUN uv sync --frozen --no-dev

EXPOSE 2024

CMD ["uv", "run", "langgraph", "dev", \
     "--host", "0.0.0.0", \
     "--config", "langgraph.json", \
     "--port", "2024", \
     "--allow-blocking"]
```

Notes for the implementer:

- The build context is the project root (`.`), not `packages/agent/`. That's why COPY paths start with `packages/agent/`.
- `uv sync --frozen` uses the lockfile without updating it. `--no-dev` skips pytest/respx.
- `--host 0.0.0.0` is required so the port is reachable from outside the container.
- `uv.lock` exists (verified) so `--frozen` will work.

- [ ] **Step 2: Build the image to verify it compiles**

Run:

```bash
docker build -t remotion-agent -f packages/agent/Dockerfile .
```

Expected: Image builds successfully. Last line shows `Successfully tagged remotion-agent:latest`. Build time ~1-2 min first time (downloading base image + pip packages).

- [ ] **Step 3: Smoke test — verify ffmpeg and uv are available inside**

Run:

```bash
docker run --rm remotion-agent ffmpeg -version | head -1
docker run --rm remotion-agent uv --version
```

Expected: ffmpeg version string (e.g., `ffmpeg version 6.x`) and uv version string.

- [ ] **Step 4: Commit**

```bash
git add packages/agent/Dockerfile
git commit -m "build(docker): add Dockerfile for LangGraph agent"
```

---

### Task 3: Create docker-compose.yml

**Files:**

- Create: `docker-compose.yml`
- Reference: `.env` (env_file source)
- Reference: `packages/agent/Dockerfile` (build target)

- [ ] **Step 1: Create `docker-compose.yml` at project root**

```yaml
services:
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
      - RENDER_SERVICE_URL=http://host.docker.internal:3100
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Notes for the implementer:

- `context: .` means Docker sends the project root as build context. The `.dockerignore` from Task 1 filters out heavy directories.
- `volumes: .:/app` bind-mounts the entire project. The agent writes voiceovers/audio here and they appear on the host instantly.
- `env_file: .env` loads all secrets (Google credentials, API keys). `environment:` entries override any matching keys from `.env`.
- `extra_hosts` makes `host.docker.internal` work on Linux. On Mac/Windows it works natively.

- [ ] **Step 2: Verify compose config parses correctly**

Run:

```bash
docker compose config
```

Expected: Prints the resolved YAML with all env vars expanded. No errors.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "build(docker): add docker-compose with agent service"
```

---

### Task 4: Update Makefile

**Files:**

- Modify: `Makefile` (lines 28-29 — the `agent` target; lines 1-3 — .PHONY list)

- [ ] **Step 1: Update .PHONY to include new targets**

Replace the first `.PHONY` block (line 1-4):

```makefile
.PHONY: help dev studio agent agent-native agent-logs agent-shell renderer web up stop \
       render validate catalog voiceover sound \
       lint typecheck check test test-visual test-visual-update \
       install install-all browser-ensure clean
```

- [ ] **Step 2: Replace the `agent` target and add helper targets**

Replace lines 28-29:

```makefile
agent: ## Start LangGraph agent server (port 2024)
	cd $(AGENT_DIR) && uv run langgraph dev --config langgraph.json --port $(AGENT_PORT) --allow-blocking
```

With:

```makefile
agent: ## Start LangGraph agent (Docker)
	docker compose up agent --build

agent-native: ## Start LangGraph agent (native, no Docker)
	cd $(AGENT_DIR) && uv run langgraph dev --config langgraph.json \
	    --port $(AGENT_PORT) --allow-blocking

agent-logs: ## Tail agent container logs
	docker compose logs -f agent

agent-shell: ## Open shell in agent container
	docker compose exec agent bash
```

- [ ] **Step 3: Verify Makefile parses and help works**

Run:

```bash
make help
```

Expected: Output shows `agent`, `agent-native`, `agent-logs`, `agent-shell` targets with descriptions. No syntax errors.

- [ ] **Step 4: Commit**

```bash
git add Makefile
git commit -m "build(make): switch agent target to Docker, add helper targets"
```

---

### Task 5: End-to-end smoke test

**Files:**

- No file changes — this is a verification task

**Prerequisites:** render-service must be running natively (`make renderer` in another terminal).

- [ ] **Step 1: Start the agent via Docker**

Run:

```bash
make agent
```

Expected: Docker builds (or uses cache), container starts, logs show `langgraph` server listening on `0.0.0.0:2024`.

- [ ] **Step 2: Verify the agent API is reachable from the host**

Run:

```bash
curl -s http://localhost:2024/ok 2>/dev/null || curl -s http://localhost:2024/info 2>/dev/null || echo "Check the agent logs for the correct health endpoint"
```

Expected: A JSON response from the LangGraph dev server (exact endpoint depends on langgraph version — `/ok`, `/info`, or `/` may work).

- [ ] **Step 3: Verify bind mount — files written by agent appear on host**

Run (in a separate terminal while agent is running):

```bash
make agent-shell
# Inside the container:
ls /app/public/audio/library/
touch /app/public/audio/test-docker-mount.tmp
exit
# Back on host:
ls public/audio/test-docker-mount.tmp && echo "Bind mount works!" && rm public/audio/test-docker-mount.tmp
```

Expected: The temp file appears on the host filesystem. Clean up after.

- [ ] **Step 4: Verify host.docker.internal resolves to render-service**

Run (in agent-shell):

```bash
make agent-shell
# Inside the container:
curl -s http://host.docker.internal:3100/api/audio/library | head -c 200
exit
```

Expected: JSON response from the render-service running natively on the host (e.g., `{"tracks":["..."]}`). This confirms the agent can reach the render-service.

- [ ] **Step 5: Verify agent-native escape hatch still works**

Stop the Docker agent (Ctrl+C), then:

```bash
make agent-native
```

Expected: LangGraph starts natively using the local `.venv`, same as before containerization.

- [ ] **Step 6: Stop and clean up**

```bash
docker compose down
```

---

### Task 6: Update CHANGELOG

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add entry under `[Unreleased]`**

Add under the `Added` category:

```markdown
### Added

- Docker containerization for LangGraph agent (`make agent` now uses Docker)
- `docker-compose.yml` with agent service, bind mount, and env passthrough
- `make agent-native` escape hatch for running without Docker
- `make agent-logs` and `make agent-shell` helper targets
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): add agent containerization entries"
```
