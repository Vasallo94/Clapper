# Agent Containerization Design

**Date:** 2026-05-04
**Status:** Draft
**Scope:** Containerize the LangGraph agent (packages/agent) for local development

## Problem

The agent resolves `PROJECT_ROOT` via `Path(__file__).resolve().parent.parent.parent.parent`, which produces Mac-specific absolute paths (e.g., `/Users/enriquevasallo/AAA/...`). This causes:

1. Path confusion when the agent writes files (voiceovers, audio, configs) to the Remotion project
2. Non-reproducible environments across machines (Python version, ffmpeg, system deps)
3. Port conflicts from orphaned `langgraph dev` processes that linger after Ctrl+C

## Decisions

- **Containerize agent only.** Render-service and web stay native on the host. The agent is the only service with the path problem and the most complex dependency tree (Python + ffmpeg + uv + Google TTS).
- **Bind mount project root.** The container mounts the full project at `/app` so the agent writes directly to the host filesystem. Changes are instant — no copy step.
- **Pass `.env` as env_file.** Same `.env` used today. No secret management infrastructure for local dev.
- **docker-compose over bare docker run.** Extensible to add render-service/web later without changing the workflow.

## Architecture

```
Host (Mac)
├── Remotion Studio (:3000)    — native
├── render-service (:3100)     — native
├── web (:5173)                — native
│
└── Docker
    └── agent (:2024)
        ├── Python 3.12-slim + uv + ffmpeg
        ├── /app ← bind mount ← project root
        ├── PROJECT_ROOT=/app
        └── RENDER_SERVICE_URL=http://host.docker.internal:3100
```

The agent reaches the render-service via `host.docker.internal`, which Docker resolves to the host's IP. The `extra_hosts` directive ensures this works on Linux too.

## Files to create/modify

### 1. `packages/agent/Dockerfile` (new)

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app/packages/agent

COPY packages/agent/pyproject.toml packages/agent/uv.lock* ./
RUN uv sync --frozen --no-dev

EXPOSE 2024

CMD ["uv", "run", "langgraph", "dev", \
     "--host", "0.0.0.0", \
     "--config", "langgraph.json", \
     "--port", "2024", \
     "--allow-blocking"]
```

Key choices:

- `python:3.12-slim` over Alpine (compiled wheel compatibility)
- Only `pyproject.toml` is COPY'd — source code arrives via bind mount
- ffmpeg included for voice.py/sound.py audio processing

### 2. `docker-compose.yml` (new, project root)

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

Key choices:

- Build context is project root (`.`) so Dockerfile can COPY from `packages/agent/`
- `extra_hosts` ensures `host.docker.internal` resolves on Linux
- `PROJECT_ROOT=/app` overrides the Python path resolution

### 3. `.dockerignore` (new, project root)

```
node_modules/
.git/
packages/agent/.venv/
packages/render-service/node_modules/
packages/web/node_modules/
dist/
out/
.remotion/
tutorials/*/output.mp4
```

### 4. `Makefile` (modify)

Replace:

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

### 5. `packages/agent/src/config.py` (modify)

No code change needed. `PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent` will resolve to `/app` inside the container because the bind mount places the file at `/app/packages/agent/src/config.py`. The env var override in `context.py` provides a second guarantee.

### 6. `GOOGLE_APPLICATION_CREDENTIALS` handling

The `.env` has `GOOGLE_APPLICATION_CREDENTIALS=./gemini_flash_tts_testing_sa.json`. Since the project root is bind-mounted at `/app`, this relative path resolves correctly inside the container as `/app/gemini_flash_tts_testing_sa.json` — no change needed.

## What stays the same

- `render-service` runs natively (`make renderer`)
- `web` runs natively (`make web`)
- Remotion Studio runs natively (`make studio`)
- `make up` continues to start all services (agent now via Docker)
- All Python source code editing happens on the host — the bind mount reflects changes instantly
- The `.env` file stays in the project root, not duplicated

## Testing the containerization

1. `make agent` — should build image and start langgraph on :2024
2. Visit LangGraph Studio or hit `http://localhost:2024` — agent responds
3. Run a video generation — agent writes voiceover/audio files to host filesystem
4. `make agent-shell` — verify `ls /app/public/audio/` shows host files
5. `make agent-native` — verify the escape hatch still works without Docker
