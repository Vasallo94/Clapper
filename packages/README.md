# Remotion Platform — Local Development

## Prerequisites

- Node.js 20+
- Python 3.12+
- uv (Python package manager)
- API key for an LLM provider (set LLM_MODEL and corresponding key)

## Start all services

Open 3 terminals:

### Terminal 1: Render service

```bash
cd packages/render-service
npm install  # first time only
npm run dev
```

### Terminal 2: Agent API

```bash
cd packages/agent
uv sync  # first time only
LLM_MODEL=google_genai:gemini-2.5-pro uv run uvicorn src.api:app --port 8000 --reload
```

### Terminal 3: Web frontend

```bash
cd packages/web
npm install  # first time only
npm run dev
```

Open http://localhost:5173 in the browser.

## Test flow

1. Type: "Quiero un video de 20 segundos del seguro de hogar para LinkedIn"
2. Wait for the agent to generate an escaleta
3. Review the checkpoint card and click "Aprobar" or "Pedir cambios"
4. After approval, the agent submits the config for rendering
5. The render job starts in the render-service (check Terminal 1 for progress)
