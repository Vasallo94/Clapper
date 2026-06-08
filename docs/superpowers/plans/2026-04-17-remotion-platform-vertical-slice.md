# Remotion Platform — Vertical Slice MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal end-to-end flow where a user sends a chat message, an AI agent generates a video escaleta, the user approves it, and the system renders an MP4 via the existing Remotion pipeline.

**Architecture:** Three services: (1) React chat frontend, (2) Python FastAPI + DeepAgents orchestrator with LangGraph interrupt-based checkpoints, (3) Node.js Express bridge that wraps the existing Remotion render scripts. The Python agent generates config.json, presents it for approval via `interrupt()`, and dispatches rendering via HTTP to the Node.js service.

**Tech Stack:** Python 3.12 + uv, DeepAgents + LangGraph, FastAPI, httpx | Node.js + Express + tsx | React + Vite

**Spec:** `docs/superpowers/specs/2026-04-17-remotion-platform-design.md`

---

## File Structure

```
remotion-playground/                   # existing project stays at root
├── src/                               # existing Remotion source (UNCHANGED)
├── scripts/
│   ├── render.ts                      # existing (UNCHANGED)
│   ├── generate-voiceover.ts          # existing (UNCHANGED)
│   ├── generate-sound-design.ts       # existing (UNCHANGED)
│   └── validate-config.ts            # NEW — CLI validator using Zod schemas
├── packages/
│   ├── render-service/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   └── server.ts              # Express app — validate + render + status
│   │   └── test/
│   │       └── server.test.ts         # Integration tests with node:test
│   ├── agent/
│   │   ├── pyproject.toml
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── tools.py               # validate, present_escaleta, submit_render, check_status
│   │   │   ├── agent.py               # create_deep_agent + prompt loading
│   │   │   └── api.py                 # FastAPI app (3 endpoints)
│   │   ├── prompts/
│   │   │   └── copywriter.md          # system prompt (migrated from skills)
│   │   └── tests/
│   │       ├── test_tools.py
│   │       └── test_api.py
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── api.ts                 # HTTP client (3 endpoints)
│           ├── types.ts               # Message, Checkpoint, RenderStatus
│           ├── App.css
│           └── components/
│               ├── ChatWindow.tsx
│               ├── MessageBubble.tsx
│               └── CheckpointCard.tsx
```

Key decisions:

- **Existing Remotion code stays at root** — no disruptive move. New packages live under `packages/`.
- **render-service communicates with root scripts via subprocess** — no shared imports, clean boundary.
- **Agent has 3 tools only** — `present_escaleta` (interrupt), `submit_render`, `check_render_status`. Validation is built into the render endpoint.
- **Frontend has no tests** — user's coworker will own frontend evolution.

---

### Task 1: Monorepo scaffold + validation script

**Files:**

- Create: `packages/.gitkeep` (placeholder for directory)
- Create: `scripts/validate-config.ts`

This task creates the directory skeleton and a validation script that the render-service will call via subprocess. The validation script reuses the existing Zod schemas from `src/`.

- [ ] **Step 1: Create package directories**

```bash
mkdir -p packages/render-service/src packages/render-service/test
mkdir -p packages/agent/src packages/agent/prompts packages/agent/tests
mkdir -p packages/web/src/components
```

- [ ] **Step 2: Write the validation script**

Create `scripts/validate-config.ts`:

```typescript
import { readFileSync } from "fs"
import { TutorialConfigSchema } from "../src/compositions/ClaudeCodeTutorial/schema"
import { ProductShortConfigSchema } from "../src/compositions/ProductShort/schema"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Usage: npx tsx scripts/validate-config.ts <path-to-config.json>")
  process.exit(2)
}

const raw = JSON.parse(readFileSync(configPath, "utf-8"))
const schema = raw.composition === "ProductShort" ? ProductShortConfigSchema : TutorialConfigSchema
const result = schema.safeParse(raw)

if (result.success) {
  console.log(JSON.stringify({ valid: true }))
} else {
  console.log(JSON.stringify({ valid: false, errors: result.error.issues }))
  process.exit(1)
}
```

- [ ] **Step 3: Test the validation script manually**

Run against an existing tutorial config:

```bash
npx tsx scripts/validate-config.ts tutorials/compact-command/config.json
```

Expected: `{"valid":true}`

Run against an invalid file:

```bash
echo '{"bad":true}' > /tmp/invalid.json && npx tsx scripts/validate-config.ts /tmp/invalid.json
```

Expected: `{"valid":false,"errors":[...]}` and exit code 1.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-config.ts packages/
git commit -m "feat(platform): scaffold monorepo directories and validation script"
```

---

### Task 2: Render service (Node.js Express bridge)

**Files:**

- Create: `packages/render-service/package.json`
- Create: `packages/render-service/tsconfig.json`
- Create: `packages/render-service/src/server.ts`
- Create: `packages/render-service/test/server.test.ts`

The render service exposes the existing Remotion pipeline as an HTTP API. It spawns `scripts/validate-config.ts` and `scripts/render.ts` as child processes pointing to the root project.

- [ ] **Step 1: Create package.json**

Create `packages/render-service/package.json`:

```json
{
  "name": "@remotion-platform/render-service",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "test": "tsx --test test/server.test.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.18",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `packages/render-service/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd packages/render-service && npm install
```

- [ ] **Step 4: Write the Express server**

Create `packages/render-service/src/server.ts`:

```typescript
import express from "express"
import cors from "cors"
import { randomUUID } from "crypto"
import { spawn } from "child_process"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"

const app = express()
app.use(cors())
app.use(express.json({ limit: "10mb" }))

const ROOT_DIR = path.resolve(__dirname, "../../..")
const JOBS_DIR = path.resolve(__dirname, "../jobs")

interface RenderJob {
  status: "validating" | "rendering" | "done" | "error"
  progress: number
  output?: string
  error?: string
}

const jobs = new Map<string, RenderJob>()

// POST /api/validate — validate config against Zod schemas
app.post("/api/validate", (req, res) => {
  const jobDir = path.join(JOBS_DIR, `validate-${randomUUID()}`)
  mkdirSync(jobDir, { recursive: true })
  const configPath = path.join(jobDir, "config.json")
  writeFileSync(configPath, JSON.stringify(req.body, null, 2))

  const child = spawn("npx", ["tsx", "scripts/validate-config.ts", configPath], {
    cwd: ROOT_DIR,
    shell: true,
  })

  let stdout = ""
  let stderr = ""
  child.stdout.on("data", (d) => (stdout += d.toString()))
  child.stderr.on("data", (d) => (stderr += d.toString()))

  child.on("close", (code) => {
    try {
      const result = JSON.parse(stdout)
      res.status(code === 0 ? 200 : 400).json(result)
    } catch {
      res.status(500).json({ error: "Validation script error", details: stderr })
    }
  })
})

// POST /api/render — submit render job
app.post("/api/render", (req, res) => {
  const jobId = randomUUID()
  const jobDir = path.join(JOBS_DIR, jobId)
  mkdirSync(jobDir, { recursive: true })

  const configPath = path.join(jobDir, "config.json")
  writeFileSync(configPath, JSON.stringify(req.body, null, 2))

  jobs.set(jobId, { status: "validating", progress: 0 })

  // First validate
  const validateChild = spawn("npx", ["tsx", "scripts/validate-config.ts", configPath], {
    cwd: ROOT_DIR,
    shell: true,
  })

  let valOut = ""
  validateChild.stdout.on("data", (d) => (valOut += d.toString()))

  validateChild.on("close", (valCode) => {
    if (valCode !== 0) {
      const job = jobs.get(jobId)!
      job.status = "error"
      try {
        job.error = JSON.stringify(JSON.parse(valOut).errors)
      } catch {
        job.error = "Config validation failed"
      }
      return
    }

    // Validation passed — start render
    const job = jobs.get(jobId)!
    job.status = "rendering"

    const renderChild = spawn("npx", ["tsx", "scripts/render.ts", configPath], {
      cwd: ROOT_DIR,
      shell: true,
    })

    renderChild.stdout.on("data", (data) => {
      const match = data.toString().match(/(\d+)%/)
      if (match) job.progress = parseInt(match[1])
    })

    renderChild.stderr.on("data", (data) => {
      // Render.ts logs to stderr for some messages
      const match = data.toString().match(/(\d+)%/)
      if (match) job.progress = parseInt(match[1])
    })

    renderChild.on("close", (code) => {
      if (code === 0) {
        job.status = "done"
        job.progress = 100
        job.output = path.join(jobDir, "output.mp4")
      } else {
        job.status = "error"
        job.error = `Render exited with code ${code}`
      }
    })
  })

  // Return immediately with job ID
  res.json({ jobId })
})

// GET /api/render/:id/status — check render progress
app.get("/api/render/:id/status", (req, res) => {
  const job = jobs.get(req.params.id)
  if (!job) {
    res.status(404).json({ error: "Job not found" })
    return
  }
  res.json({ jobId: req.params.id, ...job })
})

// GET /api/audio/library — list available music tracks
app.get("/api/audio/library", (_req, res) => {
  const libraryDir = path.join(ROOT_DIR, "public/audio/library")
  try {
    const { readdirSync } = require("fs")
    const files = readdirSync(libraryDir)
      .filter((f: string) => f.endsWith(".mp3"))
      .map((f: string) => f.replace(".mp3", ""))
    res.json({ tracks: files })
  } catch {
    res.json({ tracks: [] })
  }
})

const PORT = parseInt(process.env.PORT || "3100")
app.listen(PORT, () => {
  console.log(`Render service listening on :${PORT}`)
})

export { app }
```

- [ ] **Step 5: Write integration tests**

Create `packages/render-service/test/server.test.ts`:

```typescript
import { describe, it, before, after } from "node:test"
import assert from "node:assert"
import { app } from "../src/server.js"
import type { Server } from "http"

let server: Server
const BASE = "http://localhost:3199"

before(() => {
  server = app.listen(3199)
})

after(() => {
  server.close()
})

describe("POST /api/validate", () => {
  it("returns valid:true for a correct config", async () => {
    const config = {
      id: "test-video",
      title: "Test",
      description: "A test video",
      fps: 30,
      width: 1280,
      height: 720,
      theme: "linea-directa",
      scenes: [{ type: "intro", title: "Hello", durationInSeconds: 3 }],
    }
    const res = await fetch(`${BASE}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.valid, true)
  })

  it("returns valid:false for an invalid config", async () => {
    const res = await fetch(`${BASE}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bad: true }),
    })
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.valid, false)
    assert(Array.isArray(body.errors))
  })
})

describe("GET /api/render/:id/status", () => {
  it("returns 404 for unknown job", async () => {
    const res = await fetch(`${BASE}/api/render/nonexistent/status`)
    assert.strictEqual(res.status, 404)
  })
})

describe("GET /api/audio/library", () => {
  it("returns a list of tracks", async () => {
    const res = await fetch(`${BASE}/api/audio/library`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert(Array.isArray(body.tracks))
  })
})
```

- [ ] **Step 6: Run tests**

```bash
cd packages/render-service && npm test
```

Expected: All 4 tests pass. The validate tests call the real Zod schemas via subprocess.

- [ ] **Step 7: Add jobs/ to .gitignore**

Append to `packages/render-service/.gitignore`:

```
jobs/
node_modules/
```

- [ ] **Step 8: Test manually with curl**

Start the server and validate an existing config:

```bash
cd packages/render-service && npm run dev &
curl -s -X POST http://localhost:3100/api/validate \
  -H "Content-Type: application/json" \
  -d @../../tutorials/compact-command/config.json | jq .
```

Expected: `{"valid": true}`

Kill the background server after testing.

- [ ] **Step 9: Commit**

```bash
git add packages/render-service/
git commit -m "feat(render-service): Express bridge with validate, render, and status endpoints"
```

---

### Task 3: Copywriter prompt (migrated from skills)

**Files:**

- Create: `packages/agent/prompts/copywriter.md`

Migrate the creative criteria from the existing Claude Code skills into a standalone system prompt for the DeepAgents copywriter agent. Strip out Claude Code-specific instructions (AskUserQuestion, file operations) and keep only the editorial/creative rules.

- [ ] **Step 1: Write the copywriter system prompt**

Create `packages/agent/prompts/copywriter.md`:

````markdown
# Video Copywriter Agent

You are a video generation assistant for Linea Directa's marketing team. Users describe videos they want (tutorials, product shorts, promotional content) and you produce structured video configs.

## Your workflow

1. **Understand the request**: Ask clarifying questions if the user's request is vague (product, audience, platform, duration, tone).
2. **Generate the escaleta**: Create a scene-by-scene breakdown with durations and content.
3. **Present for approval**: Call the `present_escaleta` tool with your proposed scenes and brief. Wait for user feedback.
4. **Iterate if needed**: If the user requests changes, revise and present again. No limit on iterations.
5. **Submit for render**: Once approved, call `submit_render` with the complete config.json.
6. **Report status**: Call `check_render_status` to monitor progress and inform the user when the video is ready.

## Config structure

You generate configs that conform to this schema:

### Tutorial video (landscape 1280x720)

```json
{
  "id": "kebab-case-identifier",
  "title": "Video title",
  "description": "One-line description",
  "fps": 30,
  "width": 1280,
  "height": 720,
  "theme": "linea-directa",
  "scenes": [...]
}
```
````

### Product short (vertical 1080x1920)

```json
{
  "id": "kebab-case-identifier",
  "composition": "ProductShort",
  "product": "Product name",
  "headline": "Marketing headline",
  "theme": "linea-directa",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "scenes": [...]
}
```

## Scene types — Tutorial

| Type       | Fields                                                                   | Duration range |
| ---------- | ------------------------------------------------------------------------ | -------------- |
| `intro`    | title, subtitle?                                                         | 3-5s           |
| `terminal` | title?, lines[] (kind: command/output/claude/blank, text, delayAfterMs?) | 6-15s          |
| `callout`  | text, position (top/bottom/right), background (overlay/solid)            | 3-5s           |
| `outro`    | title, bullets[]?                                                        | 4-8s           |
| `custom`   | componentId, props?                                                      | varies         |

### Terminal line kinds

- `command`: user typing (typewriter effect, ~0.5 chars/frame)
- `output`: tool output (instant reveal)
- `claude`: AI response (streaming effect, ~1 char/frame)
- `blank`: visual separator

Rule: Don't spend too many seconds watching Claude type. Keep claude lines concise.

## Scene types — Product Short

| Type       | Fields                                      | Duration range |
| ---------- | ------------------------------------------- | -------------- |
| `hero`     | title, subtitle?                            | 2-5s           |
| `benefits` | title?, items[] (icon + text)               | 5-10s          |
| `pricing`  | price, period?, note?, variant (light/dark) | 3-6s           |
| `cta`      | text, url?                                  | 3-5s           |

## Creative rules

- **Theme is always `"linea-directa"`** unless the user explicitly requests otherwise.
- **Hook first**: The first scene must grab attention immediately. No generic intros.
- **One idea per scene**: Each scene should communicate exactly one concept.
- **Pacing**: Vary scene durations. Don't make every scene the same length.
- **Total duration**: Shorts should be 15-30s. Tutorials 60-180s. Ask if unclear.
- **Brief fields**: When presenting the escaleta, include a brief with: platform (linkedin/instagram/web), audience, goal, promise, tone, cta, hookStrategy.

## What you DON'T do

- You don't handle voiceover, sound design, or timing/beats. Those are added by other agents later.
- You don't write code or modify files directly. You generate JSON configs.
- You don't render videos yourself. You submit configs to the render service via tools.

## Language

Respond in the same language the user writes in. Most users will write in Spanish.

````

- [ ] **Step 2: Verify prompt covers key scenarios**

Read the prompt and check it covers:
- Tutorial video generation (landscape)
- Product short generation (vertical)
- Escaleta approval loop
- Scene type reference (all types documented)
- Config schema (both compositions)

- [ ] **Step 3: Commit**

```bash
git add packages/agent/prompts/
git commit -m "feat(agent): copywriter system prompt migrated from Claude Code skills"
````

---

### Task 4: Agent project setup + tools

**Files:**

- Create: `packages/agent/pyproject.toml`
- Create: `packages/agent/src/__init__.py`
- Create: `packages/agent/src/tools.py`
- Create: `packages/agent/tests/test_tools.py`

- [ ] **Step 1: Create pyproject.toml**

Create `packages/agent/pyproject.toml`:

```toml
[project]
name = "remotion-agent"
version = "0.1.0"
description = "DeepAgents orchestrator for Remotion video generation"
requires-python = ">=3.12"
dependencies = [
    "deepagents>=0.1.0",
    "langgraph>=0.4.0",
    "langchain>=0.3.0",
    "fastapi>=0.115.0",
    "uvicorn>=0.34.0",
    "httpx>=0.28.0",
    "python-dotenv>=1.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.25.0",
    "respx>=0.22.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

- [ ] **Step 2: Initialize uv project and install dependencies**

```bash
cd packages/agent && uv sync && uv sync --group dev
```

- [ ] **Step 3: Create empty **init**.py**

Create `packages/agent/src/__init__.py`:

```python

```

- [ ] **Step 4: Write the failing test for tools**

Create `packages/agent/tests/test_tools.py`:

```python
import pytest
import httpx
import respx
from src.tools import present_escaleta, submit_render, check_render_status


class TestSubmitRender:
    @respx.mock
    def test_submit_render_success(self):
        respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        result = submit_render(
            {
                "id": "test",
                "title": "Test",
                "description": "Test",
                "fps": 30,
                "width": 1280,
                "height": 720,
                "theme": "linea-directa",
                "scenes": [{"type": "intro", "title": "Hello", "durationInSeconds": 3}],
            }
        )
        assert result == {"jobId": "abc-123"}

    @respx.mock
    def test_submit_render_validation_error(self):
        respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        # Even invalid configs are accepted by the tool — validation happens in render-service
        result = submit_render({"bad": True})
        assert "jobId" in result


class TestCheckRenderStatus:
    @respx.mock
    def test_check_status_rendering(self):
        respx.get("http://localhost:3100/api/render/abc-123/status").mock(
            return_value=httpx.Response(
                200, json={"jobId": "abc-123", "status": "rendering", "progress": 42}
            )
        )
        result = check_render_status("abc-123")
        assert result["status"] == "rendering"
        assert result["progress"] == 42

    @respx.mock
    def test_check_status_done(self):
        respx.get("http://localhost:3100/api/render/done-456/status").mock(
            return_value=httpx.Response(
                200,
                json={
                    "jobId": "done-456",
                    "status": "done",
                    "progress": 100,
                    "output": "/path/to/output.mp4",
                },
            )
        )
        result = check_render_status("done-456")
        assert result["status"] == "done"
        assert result["output"] == "/path/to/output.mp4"
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd packages/agent && uv run pytest tests/test_tools.py -v
```

Expected: `ModuleNotFoundError: No module named 'src.tools'`

- [ ] **Step 6: Implement the tools**

Create `packages/agent/src/tools.py`:

```python
import os

import httpx
from langgraph.types import interrupt

RENDER_SERVICE_URL = os.environ.get("RENDER_SERVICE_URL", "http://localhost:3100")


def present_escaleta(scenes: list[dict], brief: dict) -> dict:
    """Present a video escaleta (scene breakdown) to the user for approval.

    Call this after generating a scene list. Pauses execution and waits for the
    user to approve, request changes, or reject. Returns the user's decision.

    Args:
        scenes: List of scene dicts matching the Remotion config schema.
        brief: Dict with keys: platform, audience, goal, promise, tone, cta, hookStrategy.

    Returns:
        Dict with the user's decision, e.g. {"approved": True} or
        {"approved": False, "feedback": "Make the intro shorter"}.
    """
    decision = interrupt(
        {
            "type": "escaleta_checkpoint",
            "brief": brief,
            "scenes": scenes,
        }
    )
    return decision


def submit_render(config: dict) -> dict:
    """Submit a complete video config for rendering.

    The render service validates the config against Zod schemas before starting.
    Returns a job ID for tracking, or error details if validation fails.

    Args:
        config: Complete video config dict (id, title, fps, scenes, etc.).

    Returns:
        Dict with "jobId" on success, or error details on failure.
    """
    response = httpx.post(f"{RENDER_SERVICE_URL}/api/render", json=config, timeout=30.0)
    return response.json()


def check_render_status(job_id: str) -> dict:
    """Check the status of a render job.

    Args:
        job_id: The job ID returned by submit_render.

    Returns:
        Dict with status (validating/rendering/done/error), progress (0-100),
        and optionally output (file path) or error message.
    """
    response = httpx.get(f"{RENDER_SERVICE_URL}/api/render/{job_id}/status", timeout=10.0)
    return response.json()
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd packages/agent && uv run pytest tests/test_tools.py -v
```

Expected: All 4 tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/agent/pyproject.toml packages/agent/src/ packages/agent/tests/
git commit -m "feat(agent): project setup and render-service tool wrappers"
```

---

### Task 5: Agent graph + FastAPI

**Files:**

- Create: `packages/agent/src/agent.py`
- Create: `packages/agent/src/api.py`
- Create: `packages/agent/tests/test_api.py`

- [ ] **Step 1: Write the failing test for the API**

Create `packages/agent/tests/test_api.py`:

```python
import pytest
from httpx import AsyncClient, ASGITransport

from src.api import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_chat_returns_response_or_checkpoint(client):
    response = await client.post(
        "/api/chat",
        json={"message": "Hola, quiero un video corto del seguro de hogar"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "thread_id" in body
    assert body["type"] in ("message", "checkpoint")


@pytest.mark.asyncio
async def test_chat_history_empty_thread(client):
    response = await client.get("/api/chat/nonexistent-thread")
    assert response.status_code == 200
    body = response.json()
    assert body["messages"] == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/agent && uv run pytest tests/test_api.py -v
```

Expected: `ModuleNotFoundError: No module named 'src.api'`

- [ ] **Step 3: Implement the agent module**

Create `packages/agent/src/agent.py`:

```python
import os
from pathlib import Path

from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver

from .tools import check_render_status, present_escaleta, submit_render

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def create_video_agent():
    """Create the DeepAgents video generation agent."""
    model = os.environ.get("LLM_MODEL", "google_genai:gemini-2.5-pro")
    checkpointer = MemorySaver()

    agent = create_deep_agent(
        model=model,
        tools=[present_escaleta, submit_render, check_render_status],
        system_prompt=load_prompt("copywriter"),
        checkpointer=checkpointer,
    )

    return agent
```

- [ ] **Step 4: Implement the FastAPI application**

Create `packages/agent/src/api.py`:

```python
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.types import Command
from pydantic import BaseModel

from .agent import create_video_agent

app = FastAPI(title="Remotion Video Agent")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

agent = create_video_agent()

# In-memory thread history for GET /api/chat/:threadId
_thread_messages: dict[str, list[dict]] = {}


def _generate_thread_id() -> str:
    from uuid import uuid4
    return str(uuid4())


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ResumeRequest(BaseModel):
    thread_id: str
    decision: dict


def _extract_response(result, thread_id: str) -> dict:
    """Extract a response dict from an agent invoke result."""
    if result.interrupts:
        interrupt_value = result.interrupts[0].value
        return {
            "type": "checkpoint",
            "data": interrupt_value,
            "thread_id": thread_id,
        }

    messages = result.value.get("messages", [])
    content = messages[-1].content if messages else ""
    return {
        "type": "message",
        "content": content,
        "thread_id": thread_id,
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    thread_id = request.thread_id or _generate_thread_id()
    config = {"configurable": {"thread_id": thread_id}}

    result = agent.invoke(
        {"messages": [{"role": "user", "content": request.message}]},
        config=config,
        version="v2",
    )

    return _extract_response(result, thread_id)


@app.post("/api/chat/resume")
async def resume(request: ResumeRequest):
    config = {"configurable": {"thread_id": request.thread_id}}

    result = agent.invoke(
        Command(resume=request.decision),
        config=config,
        version="v2",
    )

    return _extract_response(result, request.thread_id)


@app.get("/api/chat/{thread_id}")
async def get_history(thread_id: str):
    """Get the message history for a thread. Returns empty list if thread doesn't exist."""
    try:
        state = agent.get_state({"configurable": {"thread_id": thread_id}})
        messages = [
            {"role": m.type, "content": m.content}
            for m in state.values.get("messages", [])
        ]
        return {"thread_id": thread_id, "messages": messages}
    except Exception:
        return {"thread_id": thread_id, "messages": []}
```

- [ ] **Step 5: Run tests**

```bash
cd packages/agent && uv run pytest tests/test_api.py -v
```

Expected: Both tests pass. The chat test may take a few seconds (LLM call). If the LLM_MODEL env var is not set, it defaults to `google_genai:gemini-2.5-pro` — make sure the appropriate API key is available.

Note: If tests fail due to missing API keys, set `LLM_MODEL` and the corresponding key in the environment before running. For CI, you would mock the LLM, but for this MVP, integration tests with a real LLM are acceptable.

- [ ] **Step 6: Test the API manually**

```bash
cd packages/agent && uv run uvicorn src.api:app --port 8000 &
```

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Quiero un video corto del seguro de hogar para LinkedIn"}' | jq .
```

Expected: A JSON response with `type: "message"` or `type: "checkpoint"` and a `thread_id`.

Kill the background server after testing.

- [ ] **Step 7: Commit**

```bash
git add packages/agent/src/agent.py packages/agent/src/api.py packages/agent/tests/test_api.py
git commit -m "feat(agent): DeepAgents graph with FastAPI endpoints and escaleta checkpoint"
```

---

### Task 6: Frontend — React chat with checkpoint card

**Files:**

- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/index.html`
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/types.ts`
- Create: `packages/web/src/api.ts`
- Create: `packages/web/src/App.tsx`
- Create: `packages/web/src/App.css`
- Create: `packages/web/src/components/ChatWindow.tsx`
- Create: `packages/web/src/components/MessageBubble.tsx`
- Create: `packages/web/src/components/CheckpointCard.tsx`

- [ ] **Step 1: Create package.json**

Create `packages/web/package.json`:

```json
{
  "name": "@remotion-platform/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.5.0",
    "typescript": "^5.9.0",
    "vite": "^6.3.0"
  }
}
```

- [ ] **Step 2: Create supporting config files**

Create `packages/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Create `packages/web/vite.config.ts`:

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
```

Create `packages/web/index.html`:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video Generator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Install dependencies**

```bash
cd packages/web && npm install
```

- [ ] **Step 4: Create types and API client**

Create `packages/web/src/types.ts`:

```typescript
export type MessageRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  checkpoint?: CheckpointData
}

export interface CheckpointData {
  type: string
  brief: Record<string, string>
  scenes: ScenePreview[]
}

export interface ScenePreview {
  type: string
  title?: string
  text?: string
  durationInSeconds: number
  [key: string]: unknown
}

export interface ChatResponse {
  type: "message" | "checkpoint"
  content?: string
  data?: CheckpointData
  thread_id: string
}
```

Create `packages/web/src/api.ts`:

```typescript
import type { ChatResponse } from "./types"

const API_BASE = "http://localhost:8000"

export async function sendMessage(message: string, threadId?: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: threadId }),
  })
  return res.json()
}

export async function resumeCheckpoint(threadId: string, decision: Record<string, unknown>): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: threadId, decision }),
  })
  return res.json()
}
```

- [ ] **Step 5: Create MessageBubble component**

Create `packages/web/src/components/MessageBubble.tsx`:

```tsx
import type { ChatMessage } from "../types"

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "75%",
          padding: "10px 14px",
          borderRadius: 12,
          backgroundColor: isUser ? "#CC3333" : "#f0f0f0",
          color: isUser ? "#fff" : "#1a1a1a",
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {message.content}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create CheckpointCard component**

Create `packages/web/src/components/CheckpointCard.tsx`:

```tsx
import { useState } from "react"
import type { CheckpointData } from "../types"

interface Props {
  data: CheckpointData
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  disabled?: boolean
}

export function CheckpointCard({ data, onApprove, onRequestChanges, disabled }: Props) {
  const [feedback, setFeedback] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)

  const totalDuration = data.scenes.reduce((sum, s) => sum + (s.durationInSeconds || 0), 0)

  return (
    <div
      style={{
        border: "2px solid #CC3333",
        borderRadius: 12,
        padding: 16,
        margin: "12px 0",
        backgroundColor: "#fff",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#CC3333" }}>Escaleta propuesta</h3>

      {data.brief && (
        <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
          <strong>Plataforma:</strong> {data.brief.platform} | <strong>Audiencia:</strong> {data.brief.audience} |{" "}
          <strong>Tono:</strong> {data.brief.tone}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>
            <th style={{ padding: "4px 8px" }}>#</th>
            <th style={{ padding: "4px 8px" }}>Tipo</th>
            <th style={{ padding: "4px 8px" }}>Contenido</th>
            <th style={{ padding: "4px 8px" }}>Duracion</th>
          </tr>
        </thead>
        <tbody>
          {data.scenes.map((scene, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "4px 8px" }}>{i + 1}</td>
              <td style={{ padding: "4px 8px" }}>{scene.type}</td>
              <td style={{ padding: "4px 8px" }}>{scene.title || scene.text || "-"}</td>
              <td style={{ padding: "4px 8px" }}>{scene.durationInSeconds}s</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        <strong>Duracion total:</strong> {totalDuration}s
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onApprove}
          disabled={disabled}
          style={{
            padding: "8px 16px",
            backgroundColor: "#22c55e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          Aprobar
        </button>
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          disabled={disabled}
          style={{
            padding: "8px 16px",
            backgroundColor: "#f59e0b",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          Pedir cambios
        </button>
      </div>

      {showFeedback && (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe los cambios que quieres..."
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ddd",
              fontSize: 13,
              minHeight: 60,
            }}
          />
          <button
            onClick={() => {
              onRequestChanges(feedback)
              setFeedback("")
              setShowFeedback(false)
            }}
            disabled={disabled || !feedback.trim()}
            style={{
              marginTop: 4,
              padding: "6px 12px",
              backgroundColor: "#CC3333",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: disabled || !feedback.trim() ? "not-allowed" : "pointer",
              fontSize: 13,
            }}
          >
            Enviar feedback
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create ChatWindow component**

Create `packages/web/src/components/ChatWindow.tsx`:

```tsx
import { useEffect, useRef } from "react"
import type { ChatMessage } from "../types"
import { MessageBubble } from "./MessageBubble"
import { CheckpointCard } from "./CheckpointCard"

interface Props {
  messages: ChatMessage[]
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  loading: boolean
}

export function ChatWindow({ messages, onApprove, onRequestChanges, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      {messages.map((msg) =>
        msg.checkpoint ? (
          <CheckpointCard
            key={msg.id}
            data={msg.checkpoint}
            onApprove={onApprove}
            onRequestChanges={onRequestChanges}
            disabled={loading}
          />
        ) : (
          <MessageBubble key={msg.id} message={msg} />
        ),
      )}
      {loading && (
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: 12, backgroundColor: "#f0f0f0", fontSize: 14 }}>
            Pensando...
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 8: Create App component**

Create `packages/web/src/App.tsx`:

```tsx
import { useState } from "react"
import type { ChatMessage } from "./types"
import { sendMessage, resumeCheckpoint } from "./api"
import { ChatWindow } from "./components/ChatWindow"

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string>()
  const [loading, setLoading] = useState(false)

  const addMessage = (role: ChatMessage["role"], content: string, checkpoint?: ChatMessage["checkpoint"]): string => {
    const id = crypto.randomUUID()
    setMessages((prev) => [...prev, { id, role, content, checkpoint }])
    return id
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    addMessage("user", text)
    setLoading(true)

    try {
      const res = await sendMessage(text, threadId)
      setThreadId(res.thread_id)

      if (res.type === "checkpoint") {
        addMessage("assistant", "He preparado una propuesta de escaleta:", res.data)
      } else {
        addMessage("assistant", res.content || "")
      }
    } catch (err) {
      addMessage("assistant", `Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!threadId || loading) return
    addMessage("user", "Aprobado")
    setLoading(true)

    try {
      const res = await resumeCheckpoint(threadId, { approved: true })
      if (res.type === "checkpoint") {
        addMessage("assistant", "Nuevo checkpoint:", res.data)
      } else {
        addMessage("assistant", res.content || "")
      }
    } catch (err) {
      addMessage("assistant", `Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestChanges = async (feedback: string) => {
    if (!threadId || loading) return
    addMessage("user", `Cambios solicitados: ${feedback}`)
    setLoading(true)

    try {
      const res = await resumeCheckpoint(threadId, { approved: false, feedback })
      if (res.type === "checkpoint") {
        addMessage("assistant", "Escaleta revisada:", res.data)
      } else {
        addMessage("assistant", res.content || "")
      }
    } catch (err) {
      addMessage("assistant", `Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 720, margin: "0 auto" }}>
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "2px solid #CC3333",
          fontSize: 18,
          fontWeight: 600,
          color: "#CC3333",
        }}
      >
        Video Generator
      </header>

      <ChatWindow
        messages={messages}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        loading={loading}
      />

      <div style={{ padding: 12, borderTop: "1px solid #ddd", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Describe el video que necesitas..."
          disabled={loading}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#CC3333",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontSize: 14,
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
```

Create `packages/web/src/App.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #fafafa;
}
```

Create `packages/web/src/main.tsx`:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./App.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9: Verify frontend builds**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: No TypeScript errors.

```bash
cd packages/web && npx vite build
```

Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
git add packages/web/
git commit -m "feat(web): React chat frontend with escaleta checkpoint card"
```

---

### Task 7: End-to-end smoke test

**Files:**

- Create: `packages/README.md`

This task verifies the full flow works: user sends message -> agent generates escaleta -> user approves -> agent submits render.

- [ ] **Step 1: Create a startup guide**

Create `packages/README.md`:

````markdown
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
````

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

````

- [ ] **Step 2: Start render-service**

```bash
cd packages/render-service && npm run dev
````

Verify it starts with: `Render service listening on :3100`

- [ ] **Step 3: Start agent API**

In a separate terminal:

```bash
cd packages/agent && uv run uvicorn src.api:app --port 8000
```

Verify it starts with: `Uvicorn running on http://0.0.0.0:8000`

- [ ] **Step 4: Test the full flow via curl**

Send a chat message:

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hazme un video corto de 15 segundos del seguro de hogar"}' | jq .
```

Expected: Response with `type: "message"` (agent asking questions) or `type: "checkpoint"` (escaleta ready).

If checkpoint, approve it:

```bash
curl -s -X POST http://localhost:8000/api/chat/resume \
  -H "Content-Type: application/json" \
  -d '{"thread_id": "<THREAD_ID_FROM_ABOVE>", "decision": {"approved": true}}' | jq .
```

Expected: Agent proceeds to submit render or responds with next steps.

- [ ] **Step 5: Start web frontend and test in browser**

```bash
cd packages/web && npm run dev
```

Open http://localhost:5173. Type a message and verify:

1. The message appears in the chat
2. The agent responds (may take a few seconds)
3. If a checkpoint card appears, the approve/feedback buttons work
4. After approval, the agent reports render status

- [ ] **Step 6: Commit the README**

```bash
git add packages/README.md
git commit -m "docs(platform): local development guide for vertical slice MVP"
```

---

## Post-MVP Roadmap (not in scope for this plan)

Once the vertical slice works end-to-end, add incrementally:

1. **Director node** — add timing/beats to approved configs
2. **Preview node** — render stills per scene, add checkpoint 2
3. **Sound engineer node** — music bed + SFX, add checkpoint 3
4. **Researcher node** — web search for product info before copywriting
5. **SSE streaming** — replace request-response with streaming for real-time progress
6. **SQLite persistence** — replace MemorySaver with SqliteSaver for durable threads
7. **Render progress in frontend** — poll render status and show progress bar
