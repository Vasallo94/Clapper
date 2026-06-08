# E2E Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 bugs found during E2E testing of "Presentaciones Utiles" video — markdown rendering, checkpoint lifecycle (resolved cards + video result), custom scene titles, and pipeline tracker auto-done.

**Architecture:** Grouped by subsystem — independent groups can be implemented in parallel. Group 2 (checkpoint lifecycle) is the most interconnected: types.ts change feeds into useVideoStream.ts and ChatThread.tsx. All other groups touch isolated files.

**Tech Stack:** React 19, TypeScript strict, Vite, vitest, @langchain/langgraph-sdk, react-markdown (new dep), inline styles (no Tailwind), pnpm workspaces

**Spec:** `docs/superpowers/specs/2026-05-13-e2e-bug-fixes-design.md`

---

## File Map

| File                                             | Action | Tasks | Purpose                                   |
| ------------------------------------------------ | ------ | ----- | ----------------------------------------- |
| `packages/web/package.json`                      | Modify | 1     | Add react-markdown dependency             |
| `packages/web/src/components/MessageBubble.tsx`  | Modify | 1     | Render markdown in assistant messages     |
| `packages/web/src/components/reviewData.ts`      | Modify | 2     | Generic fallback for custom scene titles  |
| `packages/web/src/components/reviewData.test.ts` | Create | 2     | Tests for title extraction                |
| `packages/web/src/types.ts`                      | Modify | 3     | Add resolved_checkpoint enrichment type   |
| `packages/web/src/hooks/useVideoStream.ts`       | Modify | 3, 5  | Snapshot resolved checkpoints + auto-done |
| `packages/web/src/components/ChatThread.tsx`     | Modify | 3     | Render resolved checkpoint enrichments    |
| `packages/web/src/App.css`                       | Modify | 4     | Animation delay for card reveal           |
| `packages/agent/src/tools/render.py`             | Modify | 4     | Pass thread_id to render service          |
| `packages/web/src/App.tsx`                       | Modify | 4     | Broader jobId detection in messages       |

---

### Task 1: Markdown rendering in assistant messages (Bug 1)

**Files:**

- Modify: `packages/web/package.json`
- Modify: `packages/web/src/components/MessageBubble.tsx`

- [ ] **Step 1: Install react-markdown**

```bash
pnpm --filter web add react-markdown
```

Expected: `react-markdown` added to `packages/web/package.json` dependencies.

- [ ] **Step 2: Rewrite MessageBubble with ReactMarkdown for assistant messages**

Replace the entire content of `packages/web/src/components/MessageBubble.tsx`:

```tsx
import Markdown from "react-markdown"
import type { ChatMessage } from "../types"
import { theme } from "../theme"

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p style={{ margin: "0 0 8px", lineHeight: 1.6 }}>{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 600, color: theme.colors.text.primary }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0 8px", color: theme.colors.text.primary }}>
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ fontSize: 17, fontWeight: 700, margin: "14px 0 6px", color: theme.colors.text.primary }}>
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ fontSize: 15, fontWeight: 600, margin: "12px 0 4px", color: theme.colors.text.primary }}>
      {children}
    </h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: "4px 0 8px", paddingLeft: 20 }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: "4px 0 8px", paddingLeft: 20 }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: 4, lineHeight: 1.5 }}>{children}</li>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = Boolean(className)
    if (isBlock) {
      return (
        <code
          style={{
            display: "block",
            backgroundColor: theme.colors.bg.primary,
            padding: "10px 12px",
            borderRadius: theme.radius.md,
            fontFamily: theme.fonts.mono,
            fontSize: 12,
            lineHeight: 1.5,
            overflowX: "auto",
            margin: "8px 0",
            border: `1px solid ${theme.colors.border.default}`,
          }}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        style={{
          backgroundColor: theme.colors.bg.primary,
          padding: "1px 5px",
          borderRadius: 3,
          fontFamily: theme.fonts.mono,
          fontSize: 12,
        }}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }: { children?: React.ReactNode }) => <pre style={{ margin: 0 }}>{children}</pre>,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: theme.colors.accent.primary, textDecoration: "underline" }}
    >
      {children}
    </a>
  ),
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div
      className="animate-slide-in"
      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          backgroundColor: isUser ? theme.colors.accent.primary : theme.colors.bg.elevated,
          color: isUser ? "#fff" : theme.colors.text.primary,
          fontSize: 14,
          lineHeight: 1.6,
          ...(isUser ? { whiteSpace: "pre-wrap" as const } : {}),
          border: isUser ? "none" : `1px solid ${theme.colors.border.default}`,
        }}
      >
        {isUser ? message.content : <Markdown components={markdownComponents}>{message.content}</Markdown>}
      </div>
    </div>
  )
}
```

Key changes from original:

- Import `Markdown` from `react-markdown`
- User messages: keep `whiteSpace: "pre-wrap"` and render plain `{message.content}`
- Assistant messages: render via `<Markdown>` with themed `components` prop
- `markdownComponents` styles inline code, code blocks, headings, lists, links using `theme` tokens
- No remark plugins — basic markdown only

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/package.json packages/web/pnpm-lock.yaml packages/web/src/components/MessageBubble.tsx
git commit -m "feat(web): render markdown in assistant chat messages

Add react-markdown for assistant bubbles. User messages stay plain text.
Themed inline styles for headings, lists, code blocks, links."
```

---

### Task 2: Custom scene title extraction (Bug 2)

**Files:**

- Modify: `packages/web/src/components/reviewData.ts`
- Create: `packages/web/src/components/reviewData.test.ts`

- [ ] **Step 1: Write tests for title extraction**

Create `packages/web/src/components/reviewData.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { getSceneTitle } from "./reviewData"

describe("getSceneTitle", () => {
  it("returns direct title field", () => {
    expect(getSceneTitle({ title: "Intro Scene" })).toBe("Intro Scene")
  })

  it("returns props.title when top-level title missing", () => {
    expect(getSceneTitle({ props: { title: "From Props" } })).toBe("From Props")
  })

  it("returns split-screen summary from panel labels", () => {
    expect(
      getSceneTitle({
        componentId: "split-screen",
        props: { left: { label: "Before" }, right: { label: "After" } },
      }),
    ).toBe("Before · After")
  })

  it("returns problem-solution summary", () => {
    expect(
      getSceneTitle({
        componentId: "problem-solution",
        props: { problem: { title: "Bad UX" }, solution: { title: "Good UX" } },
      }),
    ).toBe("Bad UX · Good UX")
  })

  it("returns before-after summary", () => {
    expect(
      getSceneTitle({
        componentId: "before-after",
        props: { before: { title: "Old Way" }, after: { title: "New Way" } },
      }),
    ).toBe("Old Way · New Way")
  })

  it("returns flow-diagram title", () => {
    expect(
      getSceneTitle({
        componentId: "flow-diagram",
        props: { title: "Data Pipeline" },
      }),
    ).toBe("Data Pipeline")
  })

  it("returns flow-diagram step labels when no title", () => {
    expect(
      getSceneTitle({
        componentId: "flow-diagram",
        props: { steps: [{ label: "Input" }, { label: "Process" }, { label: "Output" }] },
      }),
    ).toBe("Input · Process · Output")
  })

  it("falls back to generic title search in unknown components", () => {
    expect(
      getSceneTitle({
        componentId: "timeline",
        props: { header: { title: "Project Timeline" } },
      }),
    ).toBe("Project Timeline")
  })

  it("returns dash when no title can be extracted", () => {
    expect(getSceneTitle({ componentId: "empty", props: {} })).toBe("-")
  })

  it("ignores very short or very long strings in generic fallback", () => {
    expect(
      getSceneTitle({
        componentId: "unknown",
        props: { x: "ab", y: "A".repeat(101), nested: { title: "Valid Title" } },
      }),
    ).toBe("Valid Title")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run packages/web/src/components/reviewData.test.ts
```

Expected: Tests for `problem-solution`, `before-after`, `flow-diagram`, generic fallback, and short/long filtering FAIL. Others pass.

- [ ] **Step 3: Add specific handlers and generic fallback to getCustomSceneSummary**

In `packages/web/src/components/reviewData.ts`, replace the `getCustomSceneSummary` function (lines 37-61) with:

```ts
function findTitleInProps(props: Record<string, unknown>, depth = 0): string {
  if (depth > 3) return ""
  for (const key of ["title", "label", "heading", "name"]) {
    const val = asString(props[key])
    if (val.length >= 3 && val.length <= 100) return val
  }
  for (const value of Object.values(props)) {
    const record = asRecord(value)
    if (record) {
      const found = findTitleInProps(record, depth + 1)
      if (found) return found
    }
  }
  return ""
}

function getCustomSceneSummary(componentId: string, props: Record<string, unknown>): string {
  if (componentId === "split-screen" || componentId === "problem-solution" || componentId === "before-after") {
    const keyPairs: [string, string][] = [
      ["left", "right"],
      ["problem", "solution"],
      ["before", "after"],
    ]
    for (const [a, b] of keyPairs) {
      const aRec = asRecord(props[a])
      const bRec = asRecord(props[b])
      if (aRec || bRec) {
        return joinLabels([
          asString(aRec?.label) || asString(aRec?.title),
          asString(bRec?.label) || asString(bRec?.title),
        ])
      }
    }
  }

  if (componentId === "icon-grid" || componentId === "bullet-slide") {
    const items = asArray(props.items)
      .map((item) => {
        if (typeof item === "string") return item
        const record = asRecord(item)
        return (
          asString(record?.title) || asString(record?.label) || asString(record?.text) || asString(record?.description)
        )
      })
      .filter(Boolean)
    return joinLabels(items)
  }

  if (componentId === "flow-diagram") {
    const directTitle = asString(props.title)
    if (directTitle) return directTitle
    const steps = asArray(props.steps)
      .map((s) => {
        const rec = asRecord(s)
        return asString(rec?.label) || asString(rec?.title)
      })
      .filter(Boolean)
    if (steps.length) return joinLabels(steps)
  }

  return findTitleInProps(props)
}
```

Key changes:

- `problem-solution` and `before-after` reuse the same two-panel pattern as `split-screen` via a key-pairs loop
- `flow-diagram` checks `props.title` first, then joins `steps[].label`
- Generic fallback via `findTitleInProps()` recursively searches nested objects for `title`, `label`, `heading`, `name` strings (3-100 chars, max depth 3)

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/web/src/components/reviewData.test.ts
```

Expected: All 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/reviewData.ts packages/web/src/components/reviewData.test.ts
git commit -m "fix(web): extract titles from custom scenes in escaleta cards

Add handlers for problem-solution, before-after, flow-diagram.
Add generic recursive fallback for unknown component types.
Scenes that showed '-' now display meaningful titles."
```

---

### Task 3: Resolved checkpoint enrichments (Bug 4 — card disappears)

**Files:**

- Modify: `packages/web/src/types.ts:46`
- Modify: `packages/web/src/hooks/useVideoStream.ts:191-199`
- Modify: `packages/web/src/components/ChatThread.tsx:254-274`

- [ ] **Step 1: Add resolved_checkpoint to Enrichment type**

In `packages/web/src/types.ts`, line 47, change the type union:

```ts
// OLD
type: "video_result" | "system"

// NEW
type: "video_result" | "system" | "resolved_checkpoint"
```

- [ ] **Step 2: Snapshot checkpoint in resume() before clearing**

In `packages/web/src/hooks/useVideoStream.ts`, replace the `resume` callback (lines 191-199):

```ts
const resume = useCallback(
  (decision: Record<string, unknown>) => {
    if (checkpointType && interruptValue) {
      addEnrichment({
        id: crypto.randomUUID(),
        type: "resolved_checkpoint",
        content: "",
        data: {
          checkpointType,
          checkpointData: { ...interruptValue },
          userDecision: decision,
        },
      })
    }
    stream.submit(null, {
      command: { resume: decision },
      streamSubgraphs: true,
    })
  },
  [stream, checkpointType, interruptValue, addEnrichment],
)
```

Changes from original:

- Before calling `stream.submit()`, snapshot the current `checkpointType` and `interruptValue` as a `resolved_checkpoint` enrichment
- Include the user's `decision` so we can show what they chose
- Spread `{ ...interruptValue }` to capture a snapshot (the ref will clear when interrupt resolves)

- [ ] **Step 3: Add UserDecisionBadge helper and render resolved checkpoints in ChatThread**

In `packages/web/src/components/ChatThread.tsx`:

First, add a helper component after the imports (before the Props interface, around line 36):

```tsx
function UserDecisionBadge({ decision }: { decision: Record<string, unknown> }) {
  let label = "Respondido"
  if (decision.approved === true && decision.selectedValue) {
    label = `Seleccionado: ${decision.selectedValue}`
  } else if (decision.approved === true && decision.selectedOptions) {
    const opts = decision.selectedOptions as Array<{ label: string }>
    label = `Seleccionados: ${opts.map((o) => o.label).join(", ")}`
  } else if (decision.approved === true && decision.answer) {
    label = "Respuesta enviada"
  } else if (decision.approved === true) {
    label = "Aprobado"
  } else if (decision.approved === false) {
    label = "Cambios solicitados"
  }
  return (
    <div
      style={{
        fontSize: 11,
        color: theme.colors.text.muted,
        fontFamily: theme.fonts.mono,
        padding: "4px 8px",
        marginTop: 4,
      }}
    >
      {label}
    </div>
  )
}

const DISABLED_HANDLERS = {
  onApprove: () => {},
  onRequestChanges: () => {},
}
```

Then, in the enrichments map (lines 262-274), add a case for `resolved_checkpoint` before the video_result check:

```tsx
{
  enrichments.map((enrichment) => {
    if (enrichment.type === "resolved_checkpoint" && enrichment.data) {
      const cpType = enrichment.data.checkpointType as CheckpointType
      const cpData = enrichment.data.checkpointData as Record<string, unknown>
      const userDecision = enrichment.data.userDecision as Record<string, unknown>
      if (!cpType || !cpData) return null
      return (
        <div key={enrichment.id} style={{ marginTop: 8, opacity: 0.7, pointerEvents: "none" }}>
          {renderCheckpointCard(cpType, cpData, DISABLED_HANDLERS, true)}
          <UserDecisionBadge decision={userDecision} />
        </div>
      )
    }
    if (enrichment.type === "video_result" && enrichment.data) {
      const data = enrichment.data as { jobId: string; title: string | null; fileSize: number | null }
      return <VideoResultCard key={enrichment.id} jobId={data.jobId} title={data.title} fileSize={data.fileSize} />
    }
    return (
      <MessageBubble
        key={enrichment.id}
        message={{ id: enrichment.id, role: "assistant", content: enrichment.content }}
      />
    )
  })
}
```

Key changes:

- `DISABLED_HANDLERS` is a static no-op object — no need to re-create it
- `pointerEvents: "none"` + `opacity: 0.7` makes the resolved card visually distinct and non-interactive
- `UserDecisionBadge` shows the user's choice as a muted mono label beneath the card

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/types.ts packages/web/src/hooks/useVideoStream.ts packages/web/src/components/ChatThread.tsx
git commit -m "fix(web): preserve checkpoint cards after user selection

Snapshot resolved checkpoints as enrichments before resuming stream.
Render them as disabled cards with a decision badge showing what
the user chose. Prevents loss of context in conversation history."
```

---

### Task 4: Video result auto-detection + animation polish (Bugs 3, 5)

**Files:**

- Modify: `packages/agent/src/tools/render.py:111-132`
- Modify: `packages/web/src/App.tsx:134-176`
- Modify: `packages/web/src/App.css`

- [ ] **Step 1: Pass thread_id from agent runtime to render service**

In `packages/agent/src/tools/render.py`, after the `config` dict is built (after line 132, before the sanitize step), add:

```python
    # Pass thread_id so the render service can associate job with conversation
    if runtime:
        try:
            rt_config = getattr(runtime, "config", None) or {}
            thread_id = rt_config.get("configurable", {}).get("thread_id")
            if thread_id:
                config["_threadId"] = thread_id
        except (AttributeError, TypeError):
            pass
```

Insert this before line 133 (`config, mutations = sanitize_config(config)`). The render service already reads `req.body._threadId` at `packages/render-service/src/server.ts:125`.

- [ ] **Step 2: Broaden video result detection in App.tsx**

In `packages/web/src/App.tsx`, replace the `useEffect` for video result detection (lines 134-176) with:

```tsx
useEffect(() => {
  if (videoStream.isLoading) return
  if (!videoStream.messages.length) return
  if (videoStream.isInterrupted) return

  // Scan all recent AI messages for jobId patterns (not just the last one)
  const aiMessages = videoStream.messages.filter((m) => (m as { type: string }).type === "ai")
  const lastFew = aiMessages.slice(-3)

  let jobId: string | null = null
  for (const msg of lastFew) {
    const content = typeof msg.content === "string" ? msg.content : ""
    // Match jobId in prose text or JSON-like structures
    const match =
      content.match(/jobId[:\s]*["']?([a-f0-9-]{36})["']?/i) ||
      content.match(/\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/)
    if (match) {
      jobId = match[1]
      break
    }
  }

  if (jobId) {
    fetchJobStatus(jobId)
      .then((job) => {
        if (job.status === "done") {
          const artifact = artifactFromCompletedJob(job)
          saveVideoArtifact(artifact)
          setVideoArtifacts(getVideoArtifacts())
          setActiveVideoTarget(artifact)
          setActiveTargetState(artifact)
          videoStream.addEnrichment({
            id: crypto.randomUUID(),
            type: "video_result",
            content: "Video listo:",
            data: { jobId: job.id, title: job.title, fileSize: job.file_size },
          })
        }
      })
      .catch((err) => console.warn("[auto-lookup] fetchJobStatus failed:", err))
  } else if (activeTargetRef.current?.configId) {
    fetchLatestRender(activeTargetRef.current.configId)
      .then((job) => {
        if (job) {
          videoStream.addEnrichment({
            id: crypto.randomUUID(),
            type: "video_result",
            content: "Video listo:",
            data: { jobId: job.id, title: job.title, fileSize: job.file_size },
          })
        }
      })
      .catch(() => {})
  }
}, [videoStream.isLoading]) // eslint-disable-line react-hooks/exhaustive-deps
```

Changes from original:

- Scan last 3 AI messages instead of just the last one
- Two regex patterns: specific `jobId:` key-value AND generic UUID pattern
- Keeps the `fetchLatestRender` fallback for configId-based lookup

- [ ] **Step 3: Add animation delay to card reveal**

In `packages/web/src/App.css`, modify the `.animate-card-reveal` class:

```css
/* OLD */
.animate-card-reveal {
  animation: cardReveal 300ms ease-out both;
}

/* NEW */
.animate-card-reveal {
  animation: cardReveal 300ms ease-out 200ms both;
}
```

The `200ms` value is the `animation-delay`. Cards will wait 200ms before animating in, giving the chat scroll a moment to settle. The `both` fill-mode keeps the card invisible during the delay.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run existing Python tests to ensure render.py change doesn't break**

```bash
cd packages/agent && python -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: All existing tests pass. The `runtime` attribute access is wrapped in try/except so no existing tests break.

- [ ] **Step 6: Commit**

```bash
git add packages/agent/src/tools/render.py packages/web/src/App.tsx packages/web/src/App.css
git commit -m "fix(web): auto-detect video results and polish card animations

Broaden jobId regex to scan last 3 AI messages with UUID fallback.
Pass thread_id from agent runtime to render service.
Add 200ms animation delay to checkpoint card reveal."
```

---

### Task 5: Pipeline tracker auto-done (Bug 6)

**Files:**

- Modify: `packages/web/src/hooks/useVideoStream.ts:152-165`

- [ ] **Step 1: Add loading transition tracking and auto-done**

In `packages/web/src/hooks/useVideoStream.ts`, add a `wasLoadingRef` after the `reportedSubagentsRef` declaration (after line 129):

```ts
const wasLoadingRef = useRef(false)
```

Then, after the existing pipeline tracking `useEffect` (after line 165), add a new effect:

```ts
useEffect(() => {
  const wasLoading = wasLoadingRef.current
  wasLoadingRef.current = stream.isLoading
  if (wasLoading && !stream.isLoading && !stream.error && !isInterrupted && stream.messages.length > 0) {
    onPipelineAdvanceRef.current?.("done", "Pipeline completado")
  }
}, [stream.isLoading, stream.error, isInterrupted, stream.messages.length])
```

This fires only on the `isLoading: true → false` transition, and only when:

- No error occurred
- No interrupt is active (we're not at a checkpoint)
- There are messages (not an empty stream)

PipelineStepper.tsx already handles `currentStage === "done"` correctly — shows green checkmarks for all steps and a "Completado" badge.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useVideoStream.ts
git commit -m "fix(web): auto-advance pipeline tracker to done on stream finish

Track isLoading transitions with a ref. When stream finishes without
error or interrupt, advance pipeline to done. PipelineStepper already
renders completed state correctly."
```

---

### Task 6: Final verification and CHANGELOG

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Run all web tests**

```bash
npx vitest run packages/web/
```

Expected: All tests pass (targetMetadata + reviewData).

- [ ] **Step 2: Run TypeScript check on entire project**

```bash
pnpm run lint
```

Expected: No errors.

- [ ] **Step 3: Update CHANGELOG**

Add under `[Unreleased]` in `CHANGELOG.md`:

```markdown
### Fixed

- Markdown now renders in assistant chat messages (bold, headings, lists, code blocks) instead of showing raw syntax
- Custom scene types (problem-solution, before-after, flow-diagram) show meaningful titles in escaleta and direction cards instead of "-"
- Checkpoint cards persist after user selection, showing the chosen option as a disabled card with decision badge
- VideoResultCard auto-detects render completion from broader jobId patterns across recent messages
- Pipeline tracker advances to "Completado" when stream finishes instead of staying stuck on last active stage
- Checkpoint card entrance animation has 200ms delay for smoother UX
```

- [ ] **Step 4: Commit CHANGELOG**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): document 6 E2E bug fixes from presentaciones test"
```
