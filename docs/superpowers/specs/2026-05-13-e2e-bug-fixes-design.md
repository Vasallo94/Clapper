# E2E Bug Fixes: Web UI + Backend Integration

**Date:** 2026-05-13
**Scope:** 7 bugs found during E2E test of "Presentaciones Utiles" video (3 min, 10 scenes, 9.5 MB)
**Approach:** Grouped by subsystem (Option B) — fixes applied in dependency order

---

## Group 1: Message Rendering (Bugs 1, 7)

### Bug 1 — Markdown not rendered in assistant messages

**File:** `packages/web/src/components/MessageBubble.tsx`

**Problem:** Line 25 renders `{message.content}` as plain text with `whiteSpace: "pre-wrap"`. Agent markdown (`**bold**`, `### headings`, `* lists`) appears literally.

**Fix:**

1. Install `react-markdown` in web workspace: `pnpm --filter web add react-markdown`
2. In `MessageBubble.tsx`:
   - Import `ReactMarkdown` from `react-markdown`
   - For assistant messages (`!isUser`): replace `{message.content}` with `<ReactMarkdown>{message.content}</ReactMarkdown>`
   - User messages stay plain text
   - Remove `whiteSpace: "pre-wrap"` for assistant bubbles (ReactMarkdown handles whitespace)
   - Add inline styles for rendered elements via `components` prop: `p`, `strong`, `em`, `h1`-`h3`, `ul`, `ol`, `li`, `code`, `pre`, `a`
   - Base styles: inherit `fontSize: 14`, `lineHeight: 1.6`, `color` from bubble

**No remark plugins** — agent output is basic markdown only. No GFM tables, no syntax highlighting.

### Bug 7 — SplitScreenScene crash (prop mismatch)

**File:** `src/compositions/ClaudeCodeTutorial/scenes/custom/SplitScreenScene.tsx`

**Problem:** LLM generates `{title, subtitle}` but component expects `{label, items}`.

**Status:** Already fixed. Lines 37-58 already have `normalizePanel()` and `normalizeItems()` that map `title→label`, `subtitle→items`. The crash was from a previous version. **No action needed.**

---

## Group 2: Checkpoint/Enrichment Lifecycle (Bugs 3, 4, 5)

These three bugs share the checkpoint lifecycle. The fix introduces **resolved enrichments** — when a checkpoint is acted on, it becomes a permanent enrichment in the chat history.

### Bug 4 — Interaction card disappears after selection

**Files:** `packages/web/src/hooks/useVideoStream.ts`, `packages/web/src/types.ts`, `packages/web/src/components/ChatThread.tsx`

**Problem:**

- User acts on checkpoint → `resume()` called → stream resumes → interrupt clears → `checkpointType = null` → card vanishes
- User loses context of what they chose

**Fix:**

1. **types.ts** — Add `"resolved_checkpoint"` to Enrichment type union:

   ```ts
   export interface Enrichment {
     id: string
     type: "video_result" | "system" | "resolved_checkpoint"
     content: string
     data?: Record<string, unknown>
   }
   ```

2. **useVideoStream.ts** — In `resume()` (line 191-199), before calling `stream.submit()`, snapshot the current checkpoint as a resolved enrichment:

   ```ts
   const resume = useCallback(
     (decision: Record<string, unknown>) => {
       // Snapshot current checkpoint as resolved enrichment
       if (checkpointType && interruptValue) {
         addEnrichment({
           id: crypto.randomUUID(),
           type: "resolved_checkpoint",
           content: "",
           data: {
             checkpointType,
             checkpointData: interruptValue,
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

3. **ChatThread.tsx** — In the enrichments rendering section (lines 262-274), add a case for `"resolved_checkpoint"`:

   ```tsx
   if (enrichment.type === "resolved_checkpoint" && enrichment.data) {
     const { checkpointType: cpType, checkpointData: cpData, userDecision } = enrichment.data
     return (
       <div key={enrichment.id} style={{ marginTop: 8, opacity: 0.7 }}>
         {renderCheckpointCard(cpType, cpData, dummyDisabledHandlers, true)}
         {/* Show user's selection as a small badge */}
         <UserDecisionBadge decision={userDecision} />
       </div>
     )
   }
   ```

4. **ChatThread.tsx** — Add a `UserDecisionBadge` helper component that shows what the user selected:
   - For single_choice: "Seleccionado: {option.label}"
   - For approval: "Aprobado" / "Cambios solicitados"
   - For text: "Respuesta enviada"
   - Styled as a small muted badge below the disabled card

### Bug 3 — No streaming text before interaction card

**File:** `packages/agent/src/tools/interactions.py`

**Problem:** `ask_user_interaction()` calls `interrupt()` directly at line 91. The explanatory text (title + body) is inside the interrupt payload, not emitted as a separate AI message. The frontend never sees streaming text before the card.

**Diagnosis:** This is actually by design — the `title` and `body` fields of the interrupt ARE the explanatory text, and the `InteractionRequestCard` already renders them (lines 94-107 in InteractionRequestCard.tsx). The "missing text" is a perception issue: the card appears instantly because the interrupt fires before any streaming AI content is emitted.

**Fix (backend — minimal):** No change to `interactions.py`. The current architecture is correct — the card contains its own explanatory text.

**Fix (frontend — animation):** The card already has `className="animate-card-reveal"`. The issue is that when there are no preceding AI messages, the card feels abrupt. Fix by ensuring the card entrance animation has a slight delay:

- Add a CSS `animation-delay: 200ms` to `animate-card-reveal` keyframes in the index.html or a style tag
- This gives the chat scroll a moment to settle before the card appears

### Bug 5 — VideoResultCard not shown after render

**Files:** `packages/web/src/App.tsx`, `packages/web/src/hooks/useVideoStream.ts`

**Problem (dual):**

1. The render job has `thread_id: null` — no association with conversation
2. The orchestrator says "Proceso completado" but App.tsx's auto-detection (lines 134-176) relies on regex matching `jobId` in the AI message text — fragile

**Analysis of existing code:** App.tsx lines 134-176 already try to auto-detect video results by:

- Regex matching `jobId` pattern in the last AI message
- Falling back to `fetchLatestRender(configId)` if no regex match
- This already works IF the agent mentions the jobId in its text OR an activeTarget with configId exists

**Root cause:** The orchestrator's `check_render_status` tool returns `{status: "done", id: "xxx", ...}` but the orchestrator writes a free-form text response like "Proceso completado" that may not include the jobId string.

**Fix (backend — render.py):** In `submit_render()` (line 148-151), include `thread_id` in the config sent to the render service. The render service already reads `req.body._threadId` at line 125. Add to the config dict:

```python
# In submit_render(), after building config dict (around line 132):
if runtime and hasattr(runtime, 'config') and runtime.config:
    thread_id = runtime.config.get('configurable', {}).get('thread_id')
    if thread_id:
        config["_threadId"] = thread_id
```

**Fix (frontend — improved auto-detection):** The existing App.tsx auto-detection at lines 134-176 is actually functional but has a timing issue. It runs when `isLoading` changes to false, but the last message might not yet contain the jobId. Improve by:

1. Also scan for tool message results that contain jobId patterns (tool messages from `check_render_status` and `submit_render`)
2. Also scan for the pattern `"status": "done"` in messages which indicates render completion
3. Add a fallback: when pipeline stage is `"rendering"` and transitions away, trigger job lookup

Actually, the simplest robust fix is:

**Fix (useVideoStream.ts):** When `stream.isLoading` transitions from true→false AND the pipeline was in "rendering" stage, automatically emit a lookup:

- This is already handled by the `useEffect` in App.tsx lines 134-176
- The issue is the regex `jobIdMatch = content.match(/jobId[:\s]*["']?([a-f0-9-]+)["']?/i)` doesn't match because the agent doesn't include jobId in plain text

**Concrete fix:** In `packages/agent/src/tools/render.py`, modify `check_render_status()` to return the jobId more prominently in its return dict so the orchestrator includes it in its response:

```python
# In check_render_status(), line 205-209, when status is "done":
if result.get("status") in ("done", "error"):
    result["_pipeline_complete"] = True
    result["jobId"] = job_id  # Ensure jobId is always in the result
```

AND in the orchestrator prompt (`packages/agent/prompts/orchestrator.md`), add instruction: "When render completes successfully, ALWAYS include the jobId in your response text."

**Alternative simpler fix:** Improve the App.tsx auto-detection to also scan all AI messages (not just the last one) and tool results for jobId patterns. But the backend fix is more robust.

---

## Group 3: Data Extraction (Bug 2)

### Bug 2 — Custom scenes show "-" in escaleta/direction cards

**File:** `packages/web/src/components/reviewData.ts`

**Problem:** `getCustomSceneSummary()` (lines 37-61) only handles 3 componentIds: `split-screen`, `icon-grid`, `bullet-slide`. Components like `problem-solution`, `before-after`, `flow-diagram` return `""` and fall to the `"-"` fallback.

**Fix:**

1. Add a **generic fallback** at the end of `getCustomSceneSummary()` that recursively searches props for title-like strings:

   ```ts
   function findTitleInProps(props: Record<string, unknown>): string {
     // Direct title-like fields first
     for (const key of ["title", "label", "heading", "name", "text"]) {
       const val = asString(props[key])
       if (val.length >= 3 && val.length <= 100) return val
     }
     // Recurse into nested objects
     for (const value of Object.values(props)) {
       const record = asRecord(value)
       if (record) {
         const found = findTitleInProps(record)
         if (found) return found
       }
     }
     return ""
   }
   ```

2. Add **specific handlers** for known missing types:
   - `"problem-solution"`: join `props.problem.title` + `props.solution.title`
   - `"before-after"`: join `props.before.title` + `props.after.title`
   - `"flow-diagram"`: `props.title` or join first 3 `props.steps[].label`

3. Use `findTitleInProps()` as the final fallback in `getCustomSceneSummary()` before returning `""`.

Both `CheckpointCard.tsx` (escaleta) and `DirectionCard.tsx` (direction) use `getSceneTitle()` which calls `getCustomSceneSummary()` — both benefit automatically.

---

## Group 4: Pipeline Tracking (Bug 6)

### Bug 6 — Pipeline tracker stuck on "Investigacion en curso..."

**Files:** `packages/web/src/hooks/useVideoStream.ts`, `packages/web/src/hooks/usePipelineTracker.ts`

**Problem:** The pipeline stepper shows "Investigacion" with red dot and "en curso..." even after the full pipeline completes. Other stages stay grey.

**Root cause:** The pipeline only advances when new subagents appear (`SUBAGENT_TO_STAGE` mapping in useVideoStream.ts). But:

1. The orchestrator stage is set at message send time (App.tsx line 249)
2. Subsequent stages only fire when `activeSubagents` change
3. When the stream finishes (`isLoading: false`), nothing advances to `"done"`

**Fix:**

1. **useVideoStream.ts** — Add a `useEffect` that advances to `"done"` when the stream finishes successfully:

   ```ts
   // After the pipeline tracking useEffect (line 153-165):
   useEffect(() => {
     if (!stream.isLoading && !stream.error && !isInterrupted && stream.messages.length > 0) {
       // Stream finished without error or interrupt — pipeline complete
       onPipelineAdvanceRef.current?.("done", "Pipeline completado")
     }
   }, [stream.isLoading, stream.error, isInterrupted, stream.messages.length])
   ```

   **Guard:** Only fire when transitioning from loading→not-loading. Use a ref to track previous isLoading:

   ```ts
   const wasLoadingRef = useRef(false)
   useEffect(() => {
     const wasLoading = wasLoadingRef.current
     wasLoadingRef.current = stream.isLoading
     if (wasLoading && !stream.isLoading && !stream.error && !isInterrupted && stream.messages.length > 0) {
       onPipelineAdvanceRef.current?.("done", "Pipeline completado")
     }
   }, [stream.isLoading, stream.error, isInterrupted, stream.messages.length])
   ```

2. **PipelineStepper.tsx** — Already handles `currentStage === "done"` correctly (line 277-289, shows green "Completado" badge). The `getStepStatus()` function (line 143) returns `"completed"` for all steps when `currentStage === "done"`. **No changes needed here.**

3. **Interrupt handling:** When the stream interrupts (checkpoint), the pipeline should NOT advance to "done". The guard `!isInterrupted` handles this. When the user resumes and the stream starts again, `wasLoadingRef` will track the new loading→done transition.

---

## Files Changed Summary

| File                                            | Group | Change                                    |
| ----------------------------------------------- | ----- | ----------------------------------------- |
| `packages/web/package.json`                     | 1     | Add `react-markdown` dependency           |
| `packages/web/src/components/MessageBubble.tsx` | 1     | ReactMarkdown for assistant messages      |
| `packages/web/src/components/reviewData.ts`     | 3     | Generic fallback + specific handlers      |
| `packages/web/src/types.ts`                     | 2     | Add `"resolved_checkpoint"` to Enrichment |
| `packages/web/src/hooks/useVideoStream.ts`      | 2, 4  | Snapshot resolved checkpoints + auto-done |
| `packages/web/src/components/ChatThread.tsx`    | 2     | Render resolved checkpoint enrichments    |
| `packages/agent/src/tools/render.py`            | 2     | Thread ID + prominent jobId in result     |

**No changes needed:**

- `SplitScreenScene.tsx` (Bug 7) — already fixed with `normalizePanel()`
- `PipelineStepper.tsx` (Bug 6) — already handles `"done"` state correctly
- `interactions.py` (Bug 3) — current design is correct, card has its own text
- `server.ts` — already reads `_threadId` from request body

---

## Testing Strategy

1. **Bug 1:** Send a message with markdown formatting, verify bold/headings/lists render correctly in assistant bubbles
2. **Bug 2:** Generate a video with `problem-solution`, `before-after`, or `flow-diagram` scenes, verify escaleta card shows titles instead of "-"
3. **Bug 3:** Trigger an interaction card, verify it doesn't feel abrupt (animation delay)
4. **Bug 4:** Select an option in an interaction card, verify the card remains visible (disabled) showing the selection
5. **Bug 5:** Complete a render, verify VideoResultCard appears automatically
6. **Bug 6:** Run full pipeline, verify stepper advances through stages and shows "Completado" at end
7. **Bug 7:** No test needed (already fixed)

## Risks

- **react-markdown bundle size:** ~14KB gzipped. Acceptable for a dev tool UI.
- **Resolved checkpoint enrichments growing:** Each checkpoint action adds an enrichment. For a typical pipeline (3-5 checkpoints), this is fine. No cleanup needed.
- **Pipeline "done" auto-advance race:** The `wasLoadingRef` guard prevents false positives. The `!isInterrupted` guard prevents premature "done" during checkpoints.
