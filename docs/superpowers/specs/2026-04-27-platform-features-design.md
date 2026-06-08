# Platform Features Design: Transitions, Testing, Persistence, Download, History

**Date:** 2026-04-27
**Branch:** feat/remotion-platform-mvp
**Scope:** 5 features to make the video platform cloud-ready

## Architecture Context

The platform runs 3 services:

- **Agent** (Python/DeepAgents on LangGraph Platform) — handles conversation persistence, thread state, checkpoints
- **Render service** (Express.js) — manages render jobs, video files, and now SQLite for job history
- **Web** (React/Vite) — chat UI, pipeline visualization, job management

Cloud deployment model: single container with persistent volume. LangGraph Platform for agent threads. SQLite for render jobs. Local disk for video files (GCS migration later).

---

## Feature 4: Scene Transitions

### Config Schema

Top-level `transition` field in config.json:

```json
{
  "transition": {
    "type": "fade",
    "durationInFrames": 15
  }
}
```

Supported types: `"fade"` | `"slide"` | `"wipe"` | `"none"` (default)

### Implementation

**File: `src/shared/schemas/index.ts`**
Add `TransitionConfig` Zod schema:

```ts
const TransitionType = z.enum(["fade", "slide", "wipe", "none"]).default("none")
const TransitionConfig = z
  .object({
    type: TransitionType,
    durationInFrames: z.number().int().min(1).max(60).default(15),
  })
  .optional()
```

Export and add to both composition schemas (ClaudeCodeTutorial, ProductShort).

**File: `src/shared/CompositionShell.tsx`**

- Replace `import { Series } from "remotion"` with `import { TransitionSeries } from "@remotion/transitions"`
- Import transition presentations: `fade`, `slide`, `wipe` from `@remotion/transitions`
- Map config `transition.type` to presentation function:
  ```ts
  const TRANSITION_MAP = { fade, slide, wipe }
  const presentation =
    config.transition?.type !== "none" ? TRANSITION_MAP[config.transition?.type ?? "none"] : undefined
  ```
- Replace `<Series>` with `<TransitionSeries>` and `<Series.Sequence>` with `<TransitionSeries.Sequence>`
- Pass `transition` prop to each sequence when presentation is defined:
  ```tsx
  <TransitionSeries.Sequence
    durationInFrames={durationInFrames}
    transition={presentation ? { presentation: presentation(), durationInFrames: transitionDuration } : undefined}
  />
  ```
- When transitions are active, total video duration shrinks by `(N-1) * transitionDuration` frames. `calculateMetadata` must account for this.

**File: `src/utils/calculateMetadata.ts`**
Adjust total duration calculation to subtract overlapping transition frames.

**Files unchanged:** ClaudeCodeTutorial.tsx, ProductShort.tsx — they delegate to CompositionShell.

### Agent Integration

The copywriter/director prompts should mention available transition types. The `transition` field is set at config generation time (copywriter) and not modified by the director.

---

## Feature 5: Visual Snapshot Testing

### Setup

- Install `vitest` as dev dependency in root `package.json`
- Use `renderStill()` from `@remotion/renderer` (already installed) to render specific frames
- Store snapshot PNGs in `src/__tests__/snapshots/`

### Test Structure

**Directory: `src/__tests__/`**

```
src/__tests__/
├── fixtures/
│   ├── tutorial-minimal.json    # minimal ClaudeCodeTutorial config
│   └── short-minimal.json       # minimal ProductShort config
├── snapshots/
│   ├── tutorial-frame-0.png
│   ├── tutorial-frame-mid.png
│   ├── short-frame-0.png
│   └── short-frame-mid.png
└── visual.test.ts
```

**File: `src/__tests__/visual.test.ts`**

```ts
import { renderStill } from "@remotion/renderer"
import { bundle } from "@remotion/bundler"

// Bundle once before all tests
let bundleLocation: string
beforeAll(async () => {
  bundleLocation = await bundle({ entryPoint: "./src/index.ts", webpackOverride: enableTailwind })
}, 60_000)

test("ClaudeCodeTutorial frame 0 matches snapshot", async () => {
  const config = loadFixture("tutorial-minimal.json")
  await renderStill({
    serveUrl: bundleLocation,
    composition: "ClaudeCodeTutorial",
    frame: 0,
    output: tmpPath,
    inputProps: config,
  })
  expect(await compareImages(tmpPath, snapshotPath)).toBeAbove(0.95)
})
```

### Image Comparison

Use `pixelmatch` (lightweight, no native deps) for pixel-diff comparison. Threshold: 95% match to tolerate anti-aliasing differences across platforms.

### Scripts

```json
{
  "test:visual": "vitest run src/__tests__/visual.test.ts",
  "test:visual:update": "UPDATE_SNAPSHOTS=1 vitest run src/__tests__/visual.test.ts"
}
```

When `UPDATE_SNAPSHOTS=1`, overwrite snapshot PNGs instead of comparing.

---

## Feature 6: Conversation Persistence

### Frontend Persistence Layer

**File: `packages/web/src/lib/threadStorage.ts`**

```ts
interface StoredThread {
  threadId: string
  title: string // first user message, truncated to 60 chars
  createdAt: string // ISO date
  lastActiveAt: string
}

function saveThread(thread: StoredThread): void
function getThreads(): StoredThread[]
function removeThread(threadId: string): void
function getCurrentThreadId(): string | null
function setCurrentThreadId(threadId: string | null): void
```

Uses `localStorage` with key `"remotion-threads"` (JSON array) and `"remotion-current-thread"` (string).

### App.tsx Changes

**On mount:**

1. Read `currentThreadId` from localStorage
2. If exists, call `client.threads.getState(threadId)` to load state
3. Reconstruct messages from LangGraph state `messages` array
4. If thread has pending interrupt, show checkpoint card
5. If thread doesn't exist (deleted on server), clear from localStorage

**On new message:**

1. If no threadId, create thread and save to localStorage
2. Save first user message as thread `title`
3. Update `lastActiveAt`

**New button: "Nueva conversacion"**

- Clears current threadId
- Resets messages, pipeline state
- Does NOT delete old thread (user can resume it)

### Sidebar: Thread List

Show list of previous threads below the pipeline stepper:

- Each item shows: title (truncated), date
- Click to resume: loads thread state from LangGraph
- Delete button: removes from localStorage (thread stays in LangGraph)
- Current thread highlighted

---

## Feature 7: Video Download & Preview

### Backend: Download Endpoint

**File: `packages/render-service/src/server.ts`**

```ts
app.get("/api/render/:id/download", (req, res) => {
  const job = db.getJob(req.params.id) // from SQLite
  if (!job || job.status !== "done" || !job.output_path) {
    return res.status(404).json({ error: "Video not available" })
  }
  if (!existsSync(job.output_path)) {
    return res.status(410).json({ error: "Video file deleted" })
  }
  res.download(job.output_path, `${job.config_id || job.id}.mp4`)
})
```

### Frontend: VideoResult Card

**File: `packages/web/src/components/VideoResultCard.tsx`**

Displayed when the pipeline reaches "done" state. Shows:

- Video title and duration
- `<video>` element with `src` pointing to download endpoint (streaming playback)
- "Descargar MP4" button (direct link to download endpoint)
- File size badge

Rendered in ChatThread when the final assistant message arrives with pipeline status "done".

### Integration with App.tsx

When `stream.result.type === "message"` and pipeline advances to "done":

1. Extract render jobId from the message content (or from stream metadata)
2. Poll `GET /api/render/:id/status` to get output path and file size
3. Add a `VideoResultCard` message to the chat

---

## Feature 8: Job History with SQLite

### Database Schema

**File: `packages/render-service/src/db.ts`**

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  config_id TEXT,
  title TEXT,
  composition TEXT DEFAULT 'ProductShort',
  status TEXT DEFAULT 'validating',
  progress INTEGER DEFAULT 0,
  output_path TEXT,
  file_size INTEGER,
  thread_id TEXT,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
```

### Database Module

```ts
import Database from "better-sqlite3"

const db = new Database(path.join(JOBS_DIR, "jobs.db"))
db.exec(CREATE_TABLE_SQL)

export function insertJob(job: Partial<Job>): void
export function updateJob(id: string, updates: Partial<Job>): void
export function getJob(id: string): Job | undefined
export function listJobs(limit?: number, offset?: number): Job[]
```

Using `better-sqlite3` — synchronous API, zero config, perfect for single-instance Express.

### Server Changes

**File: `packages/render-service/src/server.ts`**

- `POST /api/render`: insert job in SQLite on creation, update on status changes
- `GET /api/render/:id/status`: read from SQLite (Map becomes optional cache)
- `GET /api/render/jobs`: new endpoint, returns paginated job list
  ```json
  {
    "jobs": [...],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
  ```
- `GET /api/render/:id/download`: read output_path from SQLite, serve file
- Remove the 1-hour TTL timeout (SQLite is persistent now)

### Frontend: History View

**File: `packages/web/src/components/JobHistory.tsx`**

Accessible from sidebar. Shows a list of all render jobs:

- Title, composition type, status badge (done/error/rendering)
- Created date, file size
- Actions: download (if done), view thread (if threadId exists)

**Sidebar update:**

- Add "Historial" section below pipeline stepper
- Shows last 5 jobs inline with "Ver todo" link to full list

### Dependency

Install `better-sqlite3` in render-service:

```bash
cd packages/render-service && npm install better-sqlite3 @types/better-sqlite3
```

---

## Implementation Order

1. **Feature 8 (SQLite)** — foundation for features 7 and 8 frontend
2. **Feature 7 (Download)** — depends on SQLite for job lookup
3. **Feature 6 (Persistence)** — independent, pure frontend
4. **Feature 4 (Transitions)** — independent, pure Remotion
5. **Feature 5 (Testing)** — last, validates everything works

Features 4 and 6 can run in parallel with 8→7.

---

## Verification Plan

1. **Transitions**: `npm run dev` → open Remotion Studio → verify fade/slide/wipe on both compositions
2. **Testing**: `npm run test:visual` → all snapshots match
3. **Persistence**: Refresh page → conversation restored. Click previous thread → loads correctly.
4. **Download**: Complete a render → click download → MP4 downloads. Play in `<video>` element.
5. **Job history**: `GET /api/render/jobs` returns all past jobs. Frontend shows list with correct statuses.
