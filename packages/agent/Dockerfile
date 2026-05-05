FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app/packages/agent

COPY packages/agent/pyproject.toml packages/agent/uv.lock ./
RUN uv sync --frozen --no-dev

EXPOSE 2024

CMD uv run --project /app/packages/agent \
    langgraph dev \
    --host 0.0.0.0 \
    --config /app/packages/agent/langgraph.json \
    --port 2024 \
    --allow-blocking
