# Platform Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scene transitions, visual testing, conversation persistence, video download, and SQLite job history to make the platform cloud-ready.

**Architecture:** SQLite in render-service for job persistence. LangGraph Platform for thread persistence. localStorage for frontend thread references. `@remotion/transitions` TransitionSeries replaces Series. Vitest + renderStill + pixelmatch for visual testing.

**Tech Stack:** better-sqlite3, @remotion/transitions (already installed), vitest, pixelmatch, @langchain/langgraph-sdk (already installed)

---

## File Map

**Create:**

- `packages/render-service/src/db.ts` — SQLite database module
- `packages/web/src/lib/threadStorage.ts` — localStorage thread persistence
- `packages/web/src/components/VideoResultCard.tsx` — video preview + download card
- `packages/web/src/components/ThreadList.tsx` — sidebar thread history
- `src/__tests__/visual.test.ts` — visual snapshot tests
- `src/__tests__/fixtures/tutorial-minimal.json` — test fixture
- `src/__tests__/fixtures/short-minimal.json` — test fixture

**Modify:**

- `packages/render-service/src/server.ts` — SQLite integration, download + listing endpoints
- `packages/render-service/package.json` — add better-sqlite3
- `packages/web/src/App.tsx` — thread persistence, video result handling
- `packages/web/src/api.ts` — add render service API calls
- `packages/web/src/components/Sidebar.tsx` — thread list + job history sections
- `packages/web/src/components/ChatThread.tsx` — render VideoResultCard
- `packages/web/src/types.ts` — new types for jobs, video result
- `src/shared/schemas/index.ts` — transition schema
- `src/shared/CompositionShell.tsx` — TransitionSeries replacement
- `src/utils/calculateMetadata.ts` — transition duration adjustment
- `package.json` (root) — add vitest, pixelmatch

---

## Task 1: SQLite database module for render-service

**Files:**

- Create: `packages/render-service/src/db.ts`
- Modify: `packages/render-service/package.json`

- [ ] **Step 1: Install better-sqlite3**

```bash
cd packages/render-service && npm install better-sqlite3 && npm install -D @types/better-sqlite3
```

- [ ] **Step 2: Create db.ts**

```ts
// packages/render-service/src/db.ts
import Database from "better-sqlite3"
import path from "path"

const JOBS_DIR = process.env.JOBS_DIR || path.resolve(__dirname, "../../..", "packages/render-service/jobs")

const db = new Database(path.join(JOBS_DIR, "jobs.db"))
db.pragma("journal_mode = WAL")

db.exec(`
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
  )
`)

export interface Job {
  id: string
  config_id: string | null
  title: string | null
  composition: string
  status: string
  progress: number
  output_path: string | null
  file_size: number | null
  thread_id: string | null
  error: string | null
  created_at: string
  completed_at: string | null
}

const insertStmt = db.prepare(`
  INSERT INTO jobs (id, config_id, title, composition, status, thread_id)
  VALUES (@id, @config_id, @title, @composition, @status, @thread_id)
`)

const updateStmt = db.prepare(`
  UPDATE jobs SET status = @status, progress = @progress,
    output_path = @output_path, file_size = @file_size,
    error = @error, completed_at = @completed_at
  WHERE id = @id
`)

const getStmt = db.prepare("SELECT * FROM jobs WHERE id = ?")
const listStmt = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ? OFFSET ?")
const countStmt = db.prepare("SELECT COUNT(*) as total FROM jobs")

export function insertJob(job: {
  id: string
  config_id?: string
  title?: string
  composition?: string
  status?: string
  thread_id?: string
}): void {
  insertStmt.run({
    id: job.id,
    config_id: job.config_id ?? null,
    title: job.title ?? null,
    composition: job.composition ?? "ProductShort",
    status: job.status ?? "validating",
    thread_id: job.thread_id ?? null,
  })
}

export function updateJob(
  id: string,
  updates: Partial<Pick<Job, "status" | "progress" | "output_path" | "file_size" | "error" | "completed_at">>,
): void {
  const current = getStmt.get(id) as Job | undefined
  if (!current) return
  updateStmt.run({
    id,
    status: updates.status ?? current.status,
    progress: updates.progress ?? current.progress,
    output_path: updates.output_path ?? current.output_path,
    file_size: updates.file_size ?? current.file_size,
    error: updates.error ?? current.error,
    completed_at: updates.completed_at ?? current.completed_at,
  })
}

export function getJob(id: string): Job | undefined {
  return getStmt.get(id) as Job | undefined
}

export function listJobs(limit = 20, offset = 0): { jobs: Job[]; total: number } {
  const jobs = listStmt.all(limit, offset) as Job[]
  const { total } = countStmt.get() as { total: number }
  return { jobs, total }
}
```

- [ ] **Step 3: Verify db.ts compiles**

```bash
cd packages/render-service && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add packages/render-service/src/db.ts packages/render-service/package.json packages/render-service/package-lock.json
git commit -m "feat(render): add SQLite database module for job persistence"
```

---

## Task 2: Migrate render-service from Map to SQLite

**Files:**

- Modify: `packages/render-service/src/server.ts`

- [ ] **Step 1: Update server.ts imports and remove Map**

Replace the RenderJob interface and Map with imports from db.ts. Keep the Map as an in-memory cache for active renders only (for progress updates which happen frequently).

At the top of server.ts, add:

```ts
import { insertJob, updateJob, getJob, listJobs } from "./db"
import { statSync } from "fs"
```

Remove the `RenderJob` interface and `const jobs = new Map<string, RenderJob>()`.

- [ ] **Step 2: Update POST /api/render to use SQLite**

Replace the render endpoint body. On job creation, insert into SQLite. On status changes (validation error, render start, render complete), update SQLite. Remove the `setTimeout` TTL eviction (SQLite is persistent).

Key changes in the handler:

- After `const jobId = randomUUID()`: call `insertJob({ id: jobId, config_id: req.body.id, title: req.body.title || req.body.headline, composition: req.body.composition || "ClaudeCodeTutorial", thread_id: req.body._threadId })`
- On validation error: `updateJob(jobId, { status: "error", error: "...", completed_at: new Date().toISOString() })`
- On render start: `updateJob(jobId, { status: "rendering" })`
- On render progress: `updateJob(jobId, { progress: parseInt(match[1]) })`
- On render complete (success): `updateJob(jobId, { status: "done", progress: 100, output_path: outputPath, file_size: statSync(outputPath).st_size, completed_at: new Date().toISOString() })`
- On render complete (error): `updateJob(jobId, { status: "error", error: "...", completed_at: new Date().toISOString() })`

- [ ] **Step 3: Update GET /api/render/:id/status to read from SQLite**

```ts
app.get("/api/render/:id/status", (req, res) => {
  const job = getJob(req.params.id)
  if (!job) {
    res.status(404).json({ error: "Job not found" })
    return
  }
  res.json(job)
})
```

- [ ] **Step 4: Add GET /api/render/jobs listing endpoint**

```ts
app.get("/api/render/jobs", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0
  const result = listJobs(limit, offset)
  res.json({ ...result, limit, offset })
})
```

- [ ] **Step 5: Verify server compiles and starts**

```bash
cd packages/render-service && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add packages/render-service/src/server.ts
git commit -m "refactor(render): migrate job tracking from in-memory Map to SQLite"
```

---

## Task 3: Video download endpoint

**Files:**

- Modify: `packages/render-service/src/server.ts`

- [ ] **Step 1: Add download endpoint**

Add before the server listen call:

```ts
app.get("/api/render/:id/download", (req, res) => {
  const job = getJob(req.params.id)
  if (!job || job.status !== "done" || !job.output_path) {
    res.status(404).json({ error: "Video not available" })
    return
  }
  try {
    statSync(job.output_path)
  } catch {
    res.status(410).json({ error: "Video file deleted" })
    return
  }
  res.download(job.output_path, `${job.config_id || job.id}.mp4`)
})
```

- [ ] **Step 2: Verify and commit**

```bash
cd packages/render-service && npx tsc --noEmit
git add packages/render-service/src/server.ts
git commit -m "feat(render): add video download endpoint GET /api/render/:id/download"
```

---

## Task 4: Frontend types and API for render jobs

**Files:**

- Modify: `packages/web/src/types.ts`
- Modify: `packages/web/src/api.ts`

- [ ] **Step 1: Add render job types**

Add to `packages/web/src/types.ts`:

```ts
export interface RenderJob {
  id: string
  config_id: string | null
  title: string | null
  composition: string
  status: string
  progress: number
  output_path: string | null
  file_size: number | null
  thread_id: string | null
  error: string | null
  created_at: string
  completed_at: string | null
}

export interface JobListResponse {
  jobs: RenderJob[]
  total: number
  limit: number
  offset: number
}
```

- [ ] **Step 2: Add render service API functions**

Add to `packages/web/src/api.ts`:

```ts
const RENDER_URL = import.meta.env.VITE_RENDER_URL ?? "http://localhost:3100"

export async function fetchJobStatus(jobId: string): Promise<RenderJob> {
  const res = await fetch(`${RENDER_URL}/api/render/${jobId}/status`)
  return res.json()
}

export async function fetchJobs(limit = 20, offset = 0): Promise<JobListResponse> {
  const res = await fetch(`${RENDER_URL}/api/render/jobs?limit=${limit}&offset=${offset}`)
  return res.json()
}

export function getDownloadUrl(jobId: string): string {
  return `${RENDER_URL}/api/render/${jobId}/download`
}
```

Add the import for `RenderJob` and `JobListResponse` from types.

- [ ] **Step 3: Verify and commit**

```bash
cd packages/web && npx tsc --noEmit
git add packages/web/src/types.ts packages/web/src/api.ts
git commit -m "feat(web): add render job types and API client functions"
```

---

## Task 5: VideoResultCard component

**Files:**

- Create: `packages/web/src/components/VideoResultCard.tsx`
- Modify: `packages/web/src/components/ChatThread.tsx`
- Modify: `packages/web/src/types.ts`

- [ ] **Step 1: Add video_result checkpoint type**

In `packages/web/src/types.ts`, extend CheckpointType:

```ts
export type CheckpointType = "escaleta" | "direction" | "sound_chart" | "generic" | "video_result"
```

- [ ] **Step 2: Create VideoResultCard**

```tsx
// packages/web/src/components/VideoResultCard.tsx
import { theme } from "../theme"
import { getDownloadUrl } from "../api"
import { btnStyle } from "./btnStyle"

interface Props {
  jobId: string
  title: string | null
  fileSize: number | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function VideoResultCard({ jobId, title, fileSize }: Props) {
  const downloadUrl = getDownloadUrl(jobId)

  return (
    <div
      className="animate-card-reveal"
      style={{
        border: `1px solid ${theme.colors.status.success}33`,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        margin: "12px 0",
        backgroundColor: theme.colors.bg.elevated,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 18, backgroundColor: theme.colors.status.success, borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.colors.text.primary }}>
          {title || "Video renderizado"}
        </h3>
        {fileSize && (
          <span style={{ fontSize: 11, color: theme.colors.text.muted, fontFamily: theme.fonts.mono }}>
            {formatBytes(fileSize)}
          </span>
        )}
      </div>

      <video
        controls
        style={{
          width: "100%",
          maxHeight: 400,
          borderRadius: theme.radius.md,
          backgroundColor: "#000",
          marginBottom: 12,
        }}
      >
        <source src={downloadUrl} type="video/mp4" />
      </video>

      <a href={downloadUrl} download style={{ textDecoration: "none" }}>
        <button type="button" style={btnStyle(theme.colors.status.success)}>
          Descargar MP4
        </button>
      </a>
    </div>
  )
}
```

- [ ] **Step 3: Wire VideoResultCard into ChatThread**

In `packages/web/src/components/ChatThread.tsx`, add import:

```ts
import { VideoResultCard } from "./VideoResultCard"
```

In the messages.map block, add a case before the checkpoint handler check:

```tsx
if (msg.checkpointType === "video_result" && msg.checkpoint) {
  const data = msg.checkpoint as { jobId: string; title: string | null; fileSize: number | null }
  return (
    <div key={msg.id}>
      <MessageBubble message={{ ...msg, checkpoint: undefined }} />
      <VideoResultCard jobId={data.jobId} title={data.title} fileSize={data.fileSize} />
    </div>
  )
}
```

- [ ] **Step 4: Wire video result into App.tsx**

In `packages/web/src/App.tsx`, import `fetchJobStatus`:

```ts
import { createThread, fetchJobStatus } from "./api"
```

In the `stream.result` effect, update the `res.type === "message"` branch:

```ts
} else if (res.type === "message") {
  const content = res.content?.trim() || "Proceso completado."
  pipeline.advance("done", "Pipeline completado")
  addMessage("assistant", content)

  // Check if there's a completed render job to show
  const jobIdMatch = content.match(/jobId[:\s]*["']?([a-f0-9-]+)["']?/i)
  if (jobIdMatch) {
    fetchJobStatus(jobIdMatch[1]).then((job) => {
      if (job.status === "done") {
        addMessage("assistant", "Video listo:", { jobId: job.id, title: job.title, fileSize: job.file_size }, "video_result")
      }
    }).catch(() => {})
  }
}
```

- [ ] **Step 5: Verify and commit**

```bash
cd packages/web && npx tsc --noEmit
git add packages/web/src/components/VideoResultCard.tsx packages/web/src/components/ChatThread.tsx packages/web/src/App.tsx packages/web/src/types.ts
git commit -m "feat(web): add VideoResultCard with inline preview and download"
```

---

## Task 6: Thread persistence with localStorage

**Files:**

- Create: `packages/web/src/lib/threadStorage.ts`

- [ ] **Step 1: Create threadStorage module**

```ts
// packages/web/src/lib/threadStorage.ts
const THREADS_KEY = "remotion-threads"
const CURRENT_KEY = "remotion-current-thread"

export interface StoredThread {
  threadId: string
  title: string
  createdAt: string
  lastActiveAt: string
}

export function getThreads(): StoredThread[] {
  try {
    return JSON.parse(localStorage.getItem(THREADS_KEY) || "[]")
  } catch {
    return []
  }
}

export function saveThread(thread: StoredThread): void {
  const threads = getThreads().filter((t) => t.threadId !== thread.threadId)
  threads.unshift(thread)
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads.slice(0, 50)))
}

export function removeThread(threadId: string): void {
  const threads = getThreads().filter((t) => t.threadId !== threadId)
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads))
  if (getCurrentThreadId() === threadId) setCurrentThreadId(null)
}

export function getCurrentThreadId(): string | null {
  return localStorage.getItem(CURRENT_KEY)
}

export function setCurrentThreadId(threadId: string | null): void {
  if (threadId) localStorage.setItem(CURRENT_KEY, threadId)
  else localStorage.removeItem(CURRENT_KEY)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/threadStorage.ts
git commit -m "feat(web): add localStorage thread persistence module"
```

---

## Task 7: Wire thread persistence into App + Sidebar

**Files:**

- Modify: `packages/web/src/App.tsx`
- Create: `packages/web/src/components/ThreadList.tsx`
- Modify: `packages/web/src/components/Sidebar.tsx`

- [ ] **Step 1: Create ThreadList component**

```tsx
// packages/web/src/components/ThreadList.tsx
import { theme } from "../theme"
import type { StoredThread } from "../lib/threadStorage"

interface Props {
  threads: StoredThread[]
  currentThreadId: string | undefined
  onSelect: (threadId: string) => void
  onDelete: (threadId: string) => void
  onNew: () => void
}

export function ThreadList({ threads, currentThreadId, onSelect, onDelete, onNew }: Props) {
  return (
    <div>
      <button
        onClick={onNew}
        style={{
          width: "100%",
          padding: "8px 12px",
          backgroundColor: theme.colors.accent.primary,
          color: "#fff",
          border: "none",
          borderRadius: theme.radius.md,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        + Nueva conversacion
      </button>
      {threads.map((t) => (
        <div
          key={t.threadId}
          onClick={() => onSelect(t.threadId)}
          style={{
            padding: "8px 10px",
            borderRadius: theme.radius.sm,
            cursor: "pointer",
            backgroundColor: t.threadId === currentThreadId ? theme.colors.bg.hover : "transparent",
            borderLeft:
              t.threadId === currentThreadId ? `2px solid ${theme.colors.accent.primary}` : "2px solid transparent",
            marginBottom: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: 12,
                color: theme.colors.text.primary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 160,
              }}
            >
              {t.title || "Sin titulo"}
            </div>
            <div style={{ fontSize: 10, color: theme.colors.text.muted }}>
              {new Date(t.lastActiveAt).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(t.threadId)
            }}
            style={{
              background: "none",
              border: "none",
              color: theme.colors.text.muted,
              cursor: "pointer",
              fontSize: 14,
              padding: "2px 4px",
            }}
            aria-label="Eliminar conversacion"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update Sidebar to include ThreadList**

In `packages/web/src/components/Sidebar.tsx`, add props for thread management:

```tsx
import type { StoredThread } from "../lib/threadStorage"
import { ThreadList } from "./ThreadList"
```

Extend Props interface:

```tsx
interface Props {
  currentStage: PipelineStageId
  events: PipelineEvent[]
  threads: StoredThread[]
  currentThreadId: string | undefined
  onSelectThread: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
  onNewThread: () => void
}
```

Add a "Conversaciones" section after the EventLog section:

```tsx
<div style={{ marginTop: 16 }}>
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: theme.colors.text.muted,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: 8,
    }}
  >
    Conversaciones
  </div>
  <ThreadList
    threads={threads}
    currentThreadId={currentThreadId}
    onSelect={onSelectThread}
    onDelete={onDeleteThread}
    onNew={onNewThread}
  />
</div>
```

- [ ] **Step 3: Wire persistence into App.tsx**

Import storage functions:

```ts
import {
  getThreads,
  saveThread,
  removeThread,
  getCurrentThreadId,
  setCurrentThreadId,
  type StoredThread,
} from "./lib/threadStorage"
```

Add state for stored threads:

```ts
const [storedThreads, setStoredThreads] = useState<StoredThread[]>(() => getThreads())
```

Initialize threadId from localStorage:

```ts
const [threadId, setThreadId] = useState<string | undefined>(() => getCurrentThreadId() ?? undefined)
```

Add thread management handlers:

```ts
const handleNewThread = useCallback(() => {
  setThreadId(undefined)
  setCurrentThreadId(null)
  setMessages([])
  stream.resetStream()
  pipeline.reset()
}, [stream, pipeline])

const handleSelectThread = useCallback(
  async (tid: string) => {
    setThreadId(tid)
    setCurrentThreadId(tid)
    setMessages([])
    stream.resetStream()
    pipeline.reset()
    try {
      const state = await client.threads.getState(tid)
      const msgs = (state.values as { messages?: Array<{ type: string; content: string }> }).messages ?? []
      for (const m of msgs) {
        addMessage(
          m.type === "human" ? "user" : "assistant",
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        )
      }
    } catch {
      removeThread(tid)
      setStoredThreads(getThreads())
    }
  },
  [addMessage, stream, pipeline],
)

const handleDeleteThread = useCallback(
  (tid: string) => {
    removeThread(tid)
    setStoredThreads(getThreads())
    if (tid === threadId) handleNewThread()
  },
  [threadId, handleNewThread],
)
```

Update `handleSend` to save thread on first message:

```ts
// After setThreadId(tid):
setCurrentThreadId(tid)
saveThread({
  threadId: tid,
  title: text.slice(0, 60),
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
})
setStoredThreads(getThreads())
```

Pass to Sidebar:

```tsx
<Sidebar
  currentStage={pipeline.state.currentStage}
  events={pipeline.state.events}
  threads={storedThreads}
  currentThreadId={threadId}
  onSelectThread={handleSelectThread}
  onDeleteThread={handleDeleteThread}
  onNewThread={handleNewThread}
/>
```

- [ ] **Step 4: Verify and commit**

```bash
cd packages/web && npx tsc --noEmit
git add packages/web/src/lib/threadStorage.ts packages/web/src/components/ThreadList.tsx packages/web/src/components/Sidebar.tsx packages/web/src/App.tsx
git commit -m "feat(web): add conversation persistence with localStorage and thread list"
```

---

## Task 8: Transition schema

**Files:**

- Modify: `src/shared/schemas/index.ts`

- [ ] **Step 1: Add transition schema**

In `src/shared/schemas/index.ts`, add after existing exports:

```ts
import { z } from "zod"

export const TransitionTypeSchema = z.enum(["fade", "slide", "wipe", "none"]).default("none")
export const TransitionConfigSchema = z
  .object({
    type: TransitionTypeSchema,
    durationInFrames: z.number().int().min(1).max(60).default(15),
  })
  .optional()

export type TransitionType = z.infer<typeof TransitionTypeSchema>
export type TransitionConfig = z.infer<typeof TransitionConfigSchema>
```

- [ ] **Step 2: Add transition to composition schemas**

Read `src/compositions/ClaudeCodeTutorial/schema.ts` and `src/compositions/ProductShort/schema.ts`. Add `transition: TransitionConfigSchema` to each config schema. Import from `../../shared/schemas`.

- [ ] **Step 3: Verify and commit**

```bash
npm run lint
git add src/shared/schemas/index.ts src/compositions/ClaudeCodeTutorial/schema.ts src/compositions/ProductShort/schema.ts
git commit -m "feat(schema): add transition config to composition schemas"
```

---

## Task 9: TransitionSeries in CompositionShell + calculateMetadata

**Files:**

- Modify: `src/shared/CompositionShell.tsx`
- Modify: `src/utils/calculateMetadata.ts`

- [ ] **Step 1: Update CompositionShell to use TransitionSeries**

In `src/shared/CompositionShell.tsx`:

Replace Series import:

```ts
// Remove: import { AbsoluteFill, Audio, Sequence, Series, staticFile, useVideoConfig } from "remotion"
// Add:
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion"
import { TransitionSeries, linearTiming } from "@remotion/transitions"
import { fade } from "@remotion/transitions/fade"
import { slide } from "@remotion/transitions/slide"
import { wipe } from "@remotion/transitions/wipe"
```

Import transition type:

```ts
import type { TransitionConfig } from "./schemas"
```

Add to `CompositionShellConfig` interface:

```ts
transition?: TransitionConfig
```

Add transition resolution inside the component, before the return:

```ts
const PRESENTATIONS = { fade, slide, wipe } as const
const transitionType = config.transition?.type ?? "none"
const transitionDuration = config.transition?.durationInFrames ?? 15
const transitionPresentation =
  transitionType !== "none" && transitionType in PRESENTATIONS
    ? { presentation: PRESENTATIONS[transitionType](), timing: linearTiming({ durationInFrames: transitionDuration }) }
    : undefined
```

Replace `<Series>` with `<TransitionSeries>` and `<Series.Sequence>` with `<TransitionSeries.Sequence>`:

```tsx
<TransitionSeries>
  {sceneInfos.map((info, i) => {
    const { directedScene, durationInFrames, timing, hasVoiceover, audioDelayFrames } = info
    return (
      <TransitionSeries.Sequence
        key={i}
        durationInFrames={durationInFrames}
        transition={i > 0 ? transitionPresentation : undefined}
      >
        {/* ... same inner content (voiceover, SFX, scene, overlay) ... */}
      </TransitionSeries.Sequence>
    )
  })}
</TransitionSeries>
```

Note: transition is only applied to sequences after the first (i > 0) since there's nothing to transition from on the first scene.

- [ ] **Step 2: Update calculateMetadata for transition overlap**

In `src/utils/calculateMetadata.ts`, the total duration calculation (around line 91) needs to subtract overlap frames:

```ts
const totalSeconds = syncedScenes.reduce((sum, scene) => sum + scene.durationInSeconds, 0)
const transitionType = props.transition?.type ?? "none"
const transitionDuration = props.transition?.durationInFrames ?? 15
const transitionOverlap =
  transitionType !== "none" && syncedScenes.length > 1
    ? ((syncedScenes.length - 1) * transitionDuration) / props.fps
    : 0
const adjustedDuration = Math.ceil((totalSeconds - transitionOverlap) * props.fps)
```

Then use `adjustedDuration` instead of `Math.ceil(totalSeconds * props.fps)` for `durationInFrames`.

Also add `transition` to the `CompositionConfig` type.

- [ ] **Step 3: Verify with Remotion Studio**

```bash
npm run dev
```

Open Studio, check both compositions render without errors. Test with a config that has `"transition": { "type": "fade", "durationInFrames": 15 }`.

- [ ] **Step 4: Commit**

```bash
git add src/shared/CompositionShell.tsx src/utils/calculateMetadata.ts
git commit -m "feat(remotion): implement scene transitions with TransitionSeries"
```

---

## Task 10: Visual testing setup

**Files:**

- Modify: `package.json` (root)
- Create: `src/__tests__/fixtures/tutorial-minimal.json`
- Create: `src/__tests__/fixtures/short-minimal.json`
- Create: `src/__tests__/visual.test.ts`

- [ ] **Step 1: Install vitest and pixelmatch**

```bash
npm install -D vitest pixelmatch pngjs @types/pngjs
```

Add scripts to root `package.json`:

```json
"test:visual": "vitest run src/__tests__/visual.test.ts",
"test:visual:update": "UPDATE_SNAPSHOTS=1 vitest run src/__tests__/visual.test.ts"
```

- [ ] **Step 2: Create minimal test fixtures**

`src/__tests__/fixtures/tutorial-minimal.json`:

```json
{
  "id": "test-tutorial",
  "title": "Test Tutorial",
  "description": "Visual test fixture",
  "fps": 30,
  "width": 1280,
  "height": 720,
  "theme": "linea-directa",
  "scenes": [
    { "type": "intro", "durationInSeconds": 2, "title": "Test Video" },
    { "type": "callout", "durationInSeconds": 2, "text": "Test callout text" }
  ]
}
```

`src/__tests__/fixtures/short-minimal.json`:

```json
{
  "id": "test-short",
  "composition": "ProductShort",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "theme": "linea-directa",
  "product": "Test Product",
  "headline": "Test Headline",
  "scenes": [
    { "type": "hero", "durationInSeconds": 3, "headline": "Test Headline" },
    { "type": "cta", "durationInSeconds": 2, "text": "CTA Text", "url": "test.com" }
  ]
}
```

- [ ] **Step 3: Create visual test file**

```ts
// src/__tests__/visual.test.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import path from "path"
import { bundle } from "@remotion/bundler"
import { renderStill } from "@remotion/renderer"
import { enableTailwind } from "@remotion/tailwind-v4"
import { describe, test, expect, beforeAll } from "vitest"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"

const SNAPSHOTS_DIR = path.resolve(__dirname, "snapshots")
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1"

let bundleLocation: string

beforeAll(async () => {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true })
  bundleLocation = await bundle({
    entryPoint: path.resolve("./src/index.ts"),
    webpackOverride: enableTailwind,
  })
}, 120_000)

function loadFixture(name: string) {
  return JSON.parse(readFileSync(path.resolve(__dirname, "fixtures", name), "utf-8"))
}

async function compareOrUpdate(
  composition: string,
  frame: number,
  inputProps: Record<string, unknown>,
  snapshotName: string,
) {
  const tmpPath = path.join(SNAPSHOTS_DIR, `${snapshotName}.tmp.png`)
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${snapshotName}.png`)

  await renderStill({
    serveUrl: bundleLocation,
    composition,
    frame,
    output: tmpPath,
    inputProps,
  })

  if (UPDATE || !existsSync(snapshotPath)) {
    const data = readFileSync(tmpPath)
    writeFileSync(snapshotPath, data)
    try {
      require("fs").unlinkSync(tmpPath)
    } catch {}
    return
  }

  const actual = PNG.sync.read(readFileSync(tmpPath))
  const expected = PNG.sync.read(readFileSync(snapshotPath))
  const { width, height } = actual
  const diff = new PNG({ width, height })
  const numDiff = pixelmatch(actual.data, expected.data, diff.data, width, height, { threshold: 0.1 })
  const totalPixels = width * height
  const matchPercent = ((totalPixels - numDiff) / totalPixels) * 100

  try {
    require("fs").unlinkSync(tmpPath)
  } catch {}

  expect(matchPercent).toBeGreaterThan(95)
}

describe("ClaudeCodeTutorial", () => {
  const config = loadFixture("tutorial-minimal.json")

  test("frame 0 matches snapshot", async () => {
    await compareOrUpdate("ClaudeCodeTutorial", 0, config, "tutorial-frame-0")
  }, 60_000)
})

describe("ProductShort", () => {
  const config = loadFixture("short-minimal.json")

  test("frame 0 matches snapshot", async () => {
    await compareOrUpdate("ProductShort", 0, config, "short-frame-0")
  }, 60_000)
})
```

- [ ] **Step 4: Generate initial snapshots**

```bash
npm run test:visual:update
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:visual
```

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/ package.json package-lock.json
git commit -m "test(visual): add snapshot tests for ClaudeCodeTutorial and ProductShort"
```

---

## Task 11: Update CHANGELOG

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add entries for all 5 features**

Under `[Unreleased]`, add to the `### Added` section:

```markdown
- Scene transitions via `@remotion/transitions` (fade, slide, wipe) with global config
- Visual snapshot testing with vitest + pixelmatch for composition regression detection
- Conversation persistence: threads saved to localStorage, resume previous conversations
- Video download endpoint and inline preview player (VideoResultCard)
- SQLite-backed job history with listing, status tracking, and persistent storage
- ThreadList sidebar component for managing conversation history
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for platform features (transitions, testing, persistence, download, history)"
```
