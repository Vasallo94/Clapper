FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl git && \
    rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY --from=node:22-slim /usr/local/ /usr/local/

ENV UV_PROJECT_ENVIRONMENT=/opt/venv

# --- Node.js tooling (pnpm for Remotion render scripts) ---
WORKDIR /app
RUN npm install -g pnpm@11.1.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/render-service/package.json packages/render-service/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# --- Python agent ---
WORKDIR /app/packages/agent
COPY packages/agent/pyproject.toml packages/agent/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY packages/agent/src src
COPY packages/agent/prompts prompts
COPY packages/agent/skills skills
COPY packages/agent/graph_server.py packages/agent/langgraph.json ./
RUN uv sync --frozen --no-dev

# --- Remotion sources (absolute paths — agent reads scene catalogs, writes configs) ---
COPY src /app/src
COPY scripts /app/scripts
COPY public /app/public
COPY content /app/content
COPY remotion.config.ts tsconfig.json eslint.config.mjs /app/

EXPOSE 2024

# WORKDIR stays at /app/packages/agent so langgraph.json's
# relative path "./graph_server.py" resolves correctly.
CMD ["uv", "run", "langgraph", "dev", \
     "--host", "0.0.0.0", \
     "--port", "2024", \
     "--allow-blocking"]
