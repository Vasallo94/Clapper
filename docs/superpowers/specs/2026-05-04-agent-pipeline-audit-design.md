# Agent Pipeline Audit & Improvement Design

> Date: 2026-05-04
> Status: Draft
> Author: Claude Code + Enrique Vasallo

---

## Problem Statement

The video generation pipeline (LangGraph + DeepAgents) has 9 confirmed bugs and 5 design friction points discovered across multiple E2E runs. No run has completed fully without manual intervention. Key symptoms:

- No video has ever had background music (Bug 1: `is_dir()` instead of `is_file()`)
- Most videos lack voiceover (Bug 4: `enabled: true` never set)
- Render failures from schema mismatches (Bugs 5, 6)
- Config corruption when passed as text between agents (Design 1)
- No validation between pipeline steps (Design 2)
- LangGraph runs require ~15 manual continuations per E2E (Bug 8)

## Approach: Two Phases

### Phase 1 — Fix confirmed bugs (code-level)

### Phase 2 — Adopt idiomatic DeepAgents patterns (architecture-level)

---

## Phase 1: Bug Fixes

### Bug 1: `list_audio_library()` searches directories instead of files

**File:** `packages/agent/src/tools/sound.py:12`

**Current:**

```python
tracks = sorted(d.name for d in library_dir.iterdir() if d.is_dir())
```

**Fix:**

```python
tracks = sorted(
    d.stem for d in library_dir.iterdir()
    if d.is_file() and d.suffix == ".mp3"
)
```

Returns stems (without `.mp3`) because `copy_library_track()` appends the extension.

**Impact:** All videos will now be able to include background music from the library.

---

### Bug 2: `generate_voiceover()` base64 decode on already-decoded bytes

**File:** `packages/agent/src/tools/voice.py:~101`

**Current state:** Partially fixed with `isinstance(raw, bytes)` check.

**Fix:** Clean up the branching to be explicit:

```python
if isinstance(raw, bytes):
    audio_bytes = raw
elif isinstance(raw, str):
    padded = raw + "=" * (-len(raw) % 4)
    audio_bytes = base64.b64decode(padded)
else:
    raise ValueError(f"Unexpected audio data type: {type(raw)}")
```

Remove the convoluted `str(raw) + "="` pattern.

---

### Bug 3: FFmpeg bundled from Remotion doesn't work from agent directory

**File:** `packages/agent/src/tools/voice.py:24-37`

**Current state:** Partially fixed — prefers `shutil.which("ffmpeg")`.

**Fix:** Make the fallback explicit and fail-fast:

```python
def _find_ffmpeg() -> str:
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    raise FileNotFoundError(
        "ffmpeg not found in PATH. Install ffmpeg or set FFMPEG_PATH env var."
    )
```

Also support `FFMPEG_PATH` env var as an explicit override. Remove the Remotion bundled fallback since it doesn't work cross-directory.

---

### Bug 4: `generate_voiceover()` requires `voiceover.enabled = true` but no agent sets it

**File:** `packages/agent/src/tools/voice.py:134-135`

**Three-part fix:**

1. **In `voice.py`:** Treat presence of voiceover config with scenes as implicit enabled:

```python
if not voiceover:
    return "Voiceover not enabled in config."
if not voiceover.get("scenes"):
    return "Voiceover has no scenes defined."
```

2. **In `prompts/audio_planner.md`:** Add explicit instruction:

```
When generating the voiceover section, ALWAYS include "enabled": true.
```

3. **In `src/shared/schemas/audio.ts`:** The `VoiceoverConfigSchema` already requires `enabled: z.literal(true)`, so the schema is correct. The problem is purely that the audio_planner prompt doesn't tell the LLM to include it.

---

### Bug 5: `submit_render` defaults are for ProductShort, not ClaudeCodeTutorial

**File:** `packages/agent/src/tools/render.py:59-70`

**Fix:** Remove defaults for composition-specific fields. Make the orchestrator/prompt explicit:

```python
def submit_render(
    id: str,
    scenes: list[dict],
    title: str = "",
    description: str = "",
    fps: int = 30,
    width: int = 1280,      # Changed from 1080
    height: int = 720,       # Changed from 1920
    theme: str = "linea-directa",
    composition: str = "",   # Changed from "ProductShort"
    ...
)
```

Default to Tutorial dimensions (1280x720) since that's the more common flow. Empty `composition` string means "ClaudeCodeTutorial" (the default in the render service).

---

### Bug 6: BeatSchema requires narration, visual, animation as mandatory strings

**File:** `src/shared/schemas/direction.ts:3-11`

**Fix:** Make the three text fields optional:

```typescript
export const BeatSchema = z.object({
  id: z.string(),
  startMs: z.number().min(0),
  endMs: z.number().min(0).nullable().optional(),
  narration: z.string().nullable().optional(),
  visual: z.string().nullable().optional(),
  animation: z.string().nullable().optional(),
  emphasis: z.enum(["low", "medium", "high"]).nullable().optional(),
})
```

The director SHOULD provide all three, but the schema shouldn't block renders when one is missing. Add a warning in the validator instead.

---

### Bug 7: Checkpoint rejection feedback doesn't propagate to downstream agents

**File:** `packages/agent/src/tools/_checkpoint.py`, `prompts/orchestrator.md`

**Analysis:** When the user rejects CP2 (direction) and says "include audio", the orchestrator should re-dispatch the director with the feedback. But the orchestrator prompt says "each agent dispatched EXACTLY ONCE" which prevents re-dispatch.

**Fix (prompt-level):**

In `prompts/orchestrator.md`, change the dispatch rule:

```
- Each agent is dispatched ONCE per pipeline run.
- EXCEPTION: If a checkpoint is REJECTED with feedback, you MUST re-dispatch
  that same agent with the user's feedback appended to the task description.
  Only re-dispatch the agent that owns the rejected checkpoint.
- Forward relevant feedback to downstream agents in their task descriptions
  when it affects their work (e.g., "user wants audio" should be mentioned
  to audio_planner).
```

---

### Bug 8: LangGraph runs terminate with pending tool calls (status: "success" but next: ["tools"])

**Root cause investigation needed.** Hypotheses:

1. **DeepAgents `write_todos` + `task` parallel tool calls:** When the orchestrator emits both `write_todos` and `task` as parallel tool calls, and `write_todos` fails (Bug 9), the entire batch may abort — leaving `task` unexecuted.

2. **LangGraph dev in-memory runtime behavior:** The in-memory checkpointer may not auto-continue after tool execution. Each run may need explicit `input: null` continuation.

3. **Gemini model returning tool calls in unexpected format:** Gemini may split what should be a single response into a response + tool calls, causing LangGraph to pause between them.

**Investigation plan:**

- Add logging to `graph_server.py` to trace run state transitions
- Test with `MemorySaver` checkpointer locally (not `langgraph dev`)
- Try disabling `write_todos` to isolate if it's the parallel-call issue
- Compare behavior with `langgraph dev` vs `agent.invoke()` directly

---

### Bug 9: `write_todos` fails when Gemini sends `{"todos": {"items": [...]}}` instead of `{"todos": [...]}`

**Not our code** — this is a DeepAgents/Gemini interaction bug.

**Mitigation options:**

1. **Prompt engineering:** Add to orchestrator prompt: "When using write_todos, pass a flat list, not a nested object."
2. **Middleware wrapper:** Add middleware that intercepts `write_todos` calls and normalizes the format before execution.
3. **Disable write_todos:** If it's not critical, remove it from the orchestrator's available tools.

**Recommendation:** Option 3 (disable) for now. The `write_todos` tool is used for planning, but our pipeline has a fixed workflow that doesn't need dynamic TODO tracking. The orchestrator prompt already defines the exact sequence.

---

## Phase 2: Idiomatic DeepAgents Architecture

### 2.1 Filesystem Virtual for State Management

Replace "pass config as text in task description" with filesystem-based state.

**Directory structure on the virtual filesystem:**

```
/pipeline/
  config.json          ← Canonical config, written by copywriter, enriched by director & audio_planner
  brief.json           ← Research brief, written by researcher
  validation.json      ← Validation results, written by validator
  review.json          ← Review results, written by reviewer
/pipeline/voiceover/
  0.mp3, 1.mp3, ...    ← Written by voice_generator
  manifest.json        ← Per-scene status
/pipeline/audio/
  music-bed.mp3        ← Copied by sound_engineer
  sfx-*.mp3            ← Copied by sound_engineer
  manifest.json        ← What was copied, from where
```

**How each agent uses the filesystem:**

| Agent           | Reads                               | Writes                                                        |
| --------------- | ----------------------------------- | ------------------------------------------------------------- |
| Researcher      | —                                   | `/pipeline/brief.json`                                        |
| Copywriter      | `/pipeline/brief.json`              | `/pipeline/config.json`                                       |
| Director        | `/pipeline/config.json`             | `/pipeline/config.json` (enriched with timing/beats)          |
| Audio Planner   | `/pipeline/config.json`             | `/pipeline/config.json` (enriched with voiceover/soundDesign) |
| Voice Generator | `/pipeline/config.json`             | `/pipeline/voiceover/*.mp3` + `manifest.json`                 |
| Sound Engineer  | `/pipeline/config.json`             | `/pipeline/audio/*.mp3` + `manifest.json`                     |
| Validator       | `/pipeline/config.json`             | `/pipeline/validation.json`                                   |
| Reviewer        | `/pipeline/config.json`, output.mp4 | `/pipeline/review.json`                                       |

**Race condition mitigation:** Voice Generator and Sound Engineer run in parallel but write to separate directories (`/pipeline/voiceover/` vs `/pipeline/audio/`). Neither modifies `/pipeline/config.json`. The validator reads all three paths.

### 2.2 Runtime Context for Pipeline Metadata

Define a `@dataclass` for static per-run configuration:

```python
@dataclass
class PipelineContext:
    config_id: str           # e.g., "seguro-coche-promo"
    composition: str         # "ProductShort" | "ClaudeCodeTutorial"
    width: int               # 1080 | 1280
    height: int              # 1920 | 720
    theme: str               # "linea-directa" | "default"
    output_dir: str          # Absolute path to project root
    render_service_url: str  # "http://localhost:3100"
```

This propagates to ALL subagents automatically. Tools access it via `runtime.context.config_id` etc.

### 2.3 Prompt Updates for Filesystem Usage

Each agent's system prompt needs updating to reference the virtual filesystem instead of expecting config in the task description.

**Example — Copywriter prompt addition:**

```markdown
## State Management

- Read the research brief from `/pipeline/brief.json`
- Write your complete config.json to `/pipeline/config.json`
- The escaleta checkpoint receives the config from this file
- Do NOT return the full config as text in your response — write it to the file
```

**Example — Director prompt addition:**

```markdown
## State Management

- Read the current config from `/pipeline/config.json`
- Add timing and beats to each scene
- Write the enriched config back to `/pipeline/config.json`
- Do NOT return the full config as text — update the file
```

### 2.4 Validation Between Steps

Add a `validate_config_tool` call between key steps. The orchestrator prompt should say:

```markdown
After each agent completes, call validate_config on /pipeline/config.json to catch
errors early. If validation fails between steps, re-dispatch the last agent with
the errors appended to its task.
```

This uses the existing `validate_config()` tool but runs it after each step, not just before render.

### 2.5 Middleware Adoption

**Tool retry middleware** — for transient failures in voice generation and render submission:

```python
from deepagents.middleware.retry import create_retry_middleware

retry_middleware = create_retry_middleware(
    max_retries=2,
    retry_on=[429, 500, 503],
    backoff_factor=2.0,
)
```

**Summarization middleware** — for long conversations where context grows:

```python
from deepagents.middleware.summarization import create_summarization_tool_middleware

summarization = create_summarization_tool_middleware(model, StateBackend)
```

### 2.6 Async Subagents for Parallel Production

Replace synchronous parallel dispatch (voice_generator + sound_engineer) with DeepAgents async subagents:

```python
# In orchestrator prompt:
# 1. start_async_task("voice_generator", "Generate voiceover from /pipeline/config.json")
# 2. start_async_task("sound_engineer", "Copy audio assets from /pipeline/config.json")
# 3. Wait for both with check_async_task
```

**Caveat:** Async subagents are a preview feature. If unstable, fall back to sequential dispatch.

---

## Design Decisions

### D1: Why filesystem over response_format for config passing?

**Chosen: Filesystem virtual**

- The LLM already knows `read_file`/`write_file` (built-in tools)
- Config.json is a large object (2-5KB) — better on disk than in tool call arguments
- Avoids the orchestrator having to merge Pydantic responses manually
- Supports incremental enrichment (each agent adds fields to the same file)
- Natural for the voice_generator/sound_engineer which produce files (MP3s)

**Rejected: response_format**

- Would require the orchestrator to merge partial configs from each agent
- Adds complexity in the orchestrator prompt for assembly logic
- Config is already a JSON file — filesystem is the natural representation

### D2: Why make BeatSchema fields optional instead of enforcing in prompt?

**Chosen: Optional in schema + warning in validator**

- The director SHOULD provide narration/visual/animation, but making them required breaks renders when one is missing
- Better to render with a warning than to fail completely
- The validator can flag missing fields as warnings without blocking

### D3: Why disable write_todos instead of fixing the format?

**Chosen: Disable for now**

- Our pipeline is fixed-sequence, not dynamic planning
- write_todos adds token overhead for no benefit in our specific workflow
- The format bug is upstream (Gemini + DeepAgents interaction)
- Can re-enable if DeepAgents fixes the schema validation

### D4: Why default render dimensions to Tutorial instead of ProductShort?

**Chosen: Tutorial defaults (1280x720)**

- Tutorial is the primary workflow currently
- ProductShort requires explicit `composition: "ProductShort"` anyway
- Safer default — Tutorial failing silently is worse than ProductShort requiring explicit params

---

## File Changes Summary

### Phase 1 (Bug Fixes)

| File                                      | Change                                                            | Bug     |
| ----------------------------------------- | ----------------------------------------------------------------- | ------- |
| `packages/agent/src/tools/sound.py`       | `is_dir()` → `is_file() and suffix == '.mp3'`                     | 1       |
| `packages/agent/src/tools/voice.py`       | Clean up base64 handling, fail-fast ffmpeg, remove `enabled` gate | 2, 3, 4 |
| `packages/agent/src/tools/render.py`      | Change defaults to Tutorial dimensions                            | 5       |
| `src/shared/schemas/direction.ts`         | Make narration/visual/animation optional                          | 6       |
| `packages/agent/prompts/orchestrator.md`  | Allow re-dispatch on checkpoint rejection                         | 7       |
| `packages/agent/prompts/audio_planner.md` | Add "always include enabled: true" instruction                    | 4       |
| `packages/agent/graph_server.py`          | Add logging for run state transitions                             | 8       |
| `packages/agent/src/orchestrator.py`      | Investigate write_todos disable                                   | 9       |

### Phase 2 (DeepAgents Idiomatic)

| File                                     | Change                                               |
| ---------------------------------------- | ---------------------------------------------------- |
| `packages/agent/src/orchestrator.py`     | Add `context_schema`, middleware, filesystem routing |
| `packages/agent/prompts/*.md`            | Update all prompts for filesystem-based state        |
| `packages/agent/src/tools/voice.py`      | Read config from filesystem instead of argument      |
| `packages/agent/src/tools/sound.py`      | Write manifests to filesystem                        |
| `packages/agent/src/tools/validation.py` | Write results to filesystem                          |
| `packages/agent/src/tools/render.py`     | Read config from filesystem                          |

---

## Testing Strategy

### Phase 1 Verification

1. Unit test for `list_audio_library()` — returns MP3 stems
2. Unit test for `generate_voiceover()` — handles bytes and str audio data
3. Unit test for `_find_ffmpeg()` — fails fast when not found
4. Schema test for BeatSchema — validates with missing optional fields
5. E2E: Run one full pipeline and verify music + voiceover are present

### Phase 2 Verification

1. Integration test: copywriter writes config to filesystem, director reads it
2. Integration test: parallel voice_generator + sound_engineer don't conflict
3. E2E: Run full pipeline with filesystem-based state, verify single-run completion

---

## Success Criteria

1. A single E2E run produces a video with voiceover AND background music
2. No manual continuations needed (Bug 8 resolved or documented)
3. Checkpoint rejections correctly trigger agent re-dispatch
4. Config integrity maintained across all agent transitions (no field loss)
5. Validation errors caught between steps, not just at render time
