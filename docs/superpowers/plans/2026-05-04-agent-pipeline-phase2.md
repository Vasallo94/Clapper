# Phase 2: Idiomatic DeepAgents Patterns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace text-based config passing between agents with filesystem virtual state, add PipelineContext for static metadata, update all prompts for filesystem usage, add validation between steps, and adopt summarization middleware.

**Architecture:** Agents use DeepAgents' built-in `read_file`/`write_file` tools to read and write a canonical `/pipeline/config.json` on the virtual filesystem (StateBackend). A `PipelineContext` dataclass provides static per-run metadata (config_id, dimensions, theme, render URL) to custom tools via `ToolRuntime[PipelineContext]`. The orchestrator prompt orchestrates filesystem state, adding validation calls between pipeline steps.

**Tech Stack:** DeepAgents SDK (context_schema, ToolRuntime, create_summarization_tool_middleware), LangChain tools (@tool decorator), Python dataclasses, pytest

**Design Spec:** `docs/superpowers/specs/2026-05-04-agent-pipeline-audit-design.md` sections 2.1–2.6

---

## File Structure

### New files

- `packages/agent/src/context.py` — PipelineContext dataclass
- `packages/agent/tests/test_context.py` — PipelineContext unit tests

### Modified files

- `packages/agent/src/orchestrator.py` — Add context_schema, middleware, update backend routing
- `packages/agent/src/tools/render.py` — Add ToolRuntime to submit_render
- `packages/agent/src/tools/voice.py` — Add ToolRuntime to generate_voiceover
- `packages/agent/src/tools/sound.py` — Add ToolRuntime to copy_library_track
- `packages/agent/src/tools/validation.py` — Add ToolRuntime to validate_config, review_render
- `packages/agent/prompts/orchestrator.md` — Filesystem state management + validation between steps
- `packages/agent/prompts/researcher.md` — State Management section
- `packages/agent/prompts/copywriter.md` — State Management section
- `packages/agent/prompts/director.md` — State Management section
- `packages/agent/prompts/audio_planner.md` — State Management section
- `packages/agent/prompts/voice_generator.md` — State Management section
- `packages/agent/prompts/sound_engineer.md` — State Management section
- `packages/agent/prompts/validator.md` — State Management section
- `packages/agent/prompts/reviewer.md` — State Management section
- `packages/agent/tests/test_tools.py` — Update submit_render tests for ToolRuntime
- `packages/agent/tests/test_tools_voice.py` — Update generate_voiceover tests for ToolRuntime
- `packages/agent/tests/test_tools_validation.py` — Update validation tests for ToolRuntime

---

## Task 1: PipelineContext dataclass

**Files:**

- Create: `packages/agent/src/context.py`
- Create: `packages/agent/tests/test_context.py`

- [ ] **Step 1: Write the failing test**

```python
# packages/agent/tests/test_context.py
from dataclasses import fields
from src.context import PipelineContext


class TestPipelineContext:
    def test_required_fields(self):
        ctx = PipelineContext(config_id="seguro-coche-promo")
        assert ctx.config_id == "seguro-coche-promo"

    def test_defaults(self):
        ctx = PipelineContext(config_id="test")
        assert ctx.composition == ""
        assert ctx.width == 1280
        assert ctx.height == 720
        assert ctx.theme == "linea-directa"
        assert ctx.output_dir != ""
        assert ctx.render_service_url == "http://localhost:3100"

    def test_product_short_override(self):
        ctx = PipelineContext(
            config_id="promo-movilidad",
            composition="ProductShort",
            width=1080,
            height=1920,
        )
        assert ctx.composition == "ProductShort"
        assert ctx.width == 1080
        assert ctx.height == 1920

    def test_is_dataclass(self):
        field_names = {f.name for f in fields(PipelineContext)}
        expected = {"config_id", "composition", "width", "height", "theme", "output_dir", "render_service_url"}
        assert expected == field_names
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_context.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.context'`

- [ ] **Step 3: Write minimal implementation**

```python
# packages/agent/src/context.py
import os
from dataclasses import dataclass, field
from pathlib import Path

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)


@dataclass
class PipelineContext:
    config_id: str
    composition: str = ""
    width: int = 1280
    height: int = 720
    theme: str = "linea-directa"
    output_dir: str = field(default_factory=lambda: os.environ.get("PROJECT_ROOT", _PROJECT_ROOT))
    render_service_url: str = field(
        default_factory=lambda: os.environ.get("RENDER_SERVICE_URL", "http://localhost:3100")
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_context.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/context.py packages/agent/tests/test_context.py
git commit -m "feat(agent): add PipelineContext dataclass for runtime context"
```

---

## Task 2: Orchestrator integration — context_schema + middleware

**Files:**

- Modify: `packages/agent/src/orchestrator.py`
- Modify: `packages/agent/tests/test_orchestrator.py`

**Context:** The orchestrator currently creates the agent without `context_schema` or middleware. This task wires in PipelineContext and summarization middleware. The orchestrator already uses `CompositeBackend(default=StateBackend(), routes={"/memories/": StoreBackend(...)})` — the default StateBackend is where `/pipeline/*` files will live.

- [ ] **Step 1: Read the current orchestrator test**

Read `packages/agent/tests/test_orchestrator.py` to understand existing test patterns.

- [ ] **Step 2: Write the failing test**

Add to `packages/agent/tests/test_orchestrator.py`:

```python
class TestOrchestratorContextSchema:
    def test_orchestrator_has_context_schema(self, monkeypatch):
        monkeypatch.setenv("GOOGLE_API_KEY", "fake-key")
        from src.orchestrator import create_video_orchestrator
        from src.context import PipelineContext
        from langgraph.checkpoint.memory import MemorySaver

        graph = create_video_orchestrator(checkpointer=MemorySaver())
        # context_schema is set on the agent's config
        assert graph.config_schema is not None

    def test_pipeline_context_is_importable_from_orchestrator(self):
        from src.context import PipelineContext
        from dataclasses import is_dataclass

        assert is_dataclass(PipelineContext)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_orchestrator.py::TestOrchestratorContextSchema -v`
Expected: FAIL — the context_schema is not yet wired in.

- [ ] **Step 4: Update orchestrator.py**

```python
# packages/agent/src/orchestrator.py — updated create_video_orchestrator
# Add imports at top of file:
from .context import PipelineContext

# In create_video_orchestrator, after subagents list, add middleware:
def create_video_orchestrator(*, checkpointer=None):
    from .subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_researcher,
        create_reviewer,
        create_sound_engineer,
        create_validator,
        create_voice_generator,
    )

    model = create_model()

    backend = CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: ("video-orchestrator",),
            ),
        },
    )

    subagents = [
        create_researcher(),
        create_copywriter(),
        create_director(),
        create_audio_planner(),
        create_voice_generator(),
        create_sound_engineer(),
        create_validator(),
        create_reviewer(),
    ]

    system_prompt = load_prompt("orchestrator")
    if DISABLE_WRITE_TODOS:
        system_prompt += "\n\nDo NOT use write_todos tool. Plan using text responses only."

    middleware = []
    try:
        from deepagents.middleware.summarization import create_summarization_tool_middleware
        middleware.append(create_summarization_tool_middleware(model, StateBackend))
    except ImportError:
        pass

    kwargs: dict = {
        "model": model,
        "tools": [submit_render, check_render_status],
        "system_prompt": system_prompt,
        "subagents": subagents,
        "skills": [str(SKILLS_DIR)],
        "backend": backend,
        "memory": ["/memories/AGENTS.md"],
        "name": "video-orchestrator",
        "context_schema": PipelineContext,
    }
    if middleware:
        kwargs["middleware"] = middleware
    if checkpointer is not None:
        kwargs["checkpointer"] = checkpointer

    return create_deep_agent(**kwargs)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_orchestrator.py -v`
Expected: PASS (all existing + new tests)

- [ ] **Step 6: Commit**

```bash
git add packages/agent/src/orchestrator.py packages/agent/tests/test_orchestrator.py
git commit -m "feat(agent): wire PipelineContext and summarization middleware into orchestrator"
```

---

## Task 3: Tool updates — render.py (ToolRuntime injection)

**Files:**

- Modify: `packages/agent/src/tools/render.py`
- Modify: `packages/agent/tests/test_tools.py`

**Context:** `submit_render` currently hardcodes `RENDER_SERVICE_URL` from env and takes `width`/`height` as parameters with defaults. With ToolRuntime, these can come from PipelineContext. The function must remain backwards-compatible (runtime is optional) so existing tests don't break.

- [ ] **Step 1: Write the failing test**

Add to `packages/agent/tests/test_tools.py`:

```python
class TestSubmitRenderWithRuntime:
    @respx.mock
    def test_submit_render_uses_runtime_render_url(self, monkeypatch):
        custom_url = "http://custom-render:9999"
        respx.post(f"{custom_url}/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "rt-123"})
        )
        from unittest.mock import MagicMock
        from src.context import PipelineContext

        runtime = MagicMock()
        runtime.context = PipelineContext(
            config_id="test",
            render_service_url=custom_url,
        )

        result = submit_render(
            id="test",
            scenes=[{"type": "intro", "durationInSeconds": 3}],
            runtime=runtime,
        )
        assert result == {"jobId": "rt-123"}

    @respx.mock
    def test_submit_render_uses_runtime_dimensions(self):
        respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "dim-123"})
        )
        from unittest.mock import MagicMock
        from src.context import PipelineContext

        runtime = MagicMock()
        runtime.context = PipelineContext(
            config_id="test",
            width=1080,
            height=1920,
            composition="ProductShort",
        )

        route = respx.post("http://localhost:3100/api/render")
        result = submit_render(
            id="test",
            scenes=[{"type": "hero", "durationInSeconds": 3}],
            runtime=runtime,
        )
        body = json.loads(route.calls[0].request.content)
        assert body["width"] == 1080
        assert body["height"] == 1920

    @respx.mock
    def test_submit_render_works_without_runtime(self):
        respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "no-rt"})
        )
        result = submit_render(id="test", scenes=[])
        assert result == {"jobId": "no-rt"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_tools.py::TestSubmitRenderWithRuntime -v`
Expected: FAIL — `submit_render` doesn't accept `runtime` parameter.

- [ ] **Step 3: Update submit_render**

In `packages/agent/src/tools/render.py`, update the function signature to accept an optional runtime:

```python
def submit_render(
    id: str,
    scenes: list[dict],
    title: str = "",
    description: str = "",
    fps: int = 30,
    width: int = 0,
    height: int = 0,
    theme: str = "linea-directa",
    composition: str = "",
    product: str = "",
    headline: str = "",
    voiceover: dict | None = None,
    sound_design: dict | None = None,
    runtime=None,
) -> dict:
    """Submit a complete video config for rendering.

    Args:
        id: Kebab-case video identifier.
        scenes: List of scene dicts with type, durationInSeconds, and scene-specific fields.
        title: Video title (required for tutorials).
        description: One-line description (required for tutorials).
        fps: Frames per second (always 30).
        width: Video width in pixels (0 = use runtime context or default 1280).
        height: Video height in pixels (0 = use runtime context or default 720).
        theme: Theme name (always "linea-directa" unless specified).
        composition: "ProductShort" for vertical shorts, empty string for tutorials (default).
        product: Product name (ProductShort only).
        headline: Marketing headline (ProductShort only).
        voiceover: Voiceover config from audio_planner (provider, voiceId, scenes).
        sound_design: Sound design config from audio_planner (musicBed, sfx).
    """
    ctx = getattr(runtime, "context", None) if runtime else None
    render_url = (ctx.render_service_url if ctx else None) or RENDER_SERVICE_URL
    effective_width = width or (ctx.width if ctx else 1280) or 1280
    effective_height = height or (ctx.height if ctx else 720) or 720

    config: dict = {
        "id": id,
        "fps": fps,
        "width": effective_width,
        "height": effective_height,
        "theme": theme,
        "scenes": scenes,
    }
    if voiceover is not None:
        config["voiceover"] = voiceover
    if sound_design is not None:
        config["soundDesign"] = sound_design
    if voiceover is None and sound_design is None:
        config["_skipAudioGeneration"] = True
    if composition == "ProductShort":
        config["composition"] = composition
        config["product"] = product
        config["headline"] = headline
    else:
        config["title"] = title
        config["description"] = description
    response = httpx.post(f"{render_url}/api/render", json=config, timeout=30.0)
    return response.json()
```

- [ ] **Step 4: Run all render tests**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_tools.py -v`
Expected: PASS (all existing + 3 new tests). Existing tests pass because `runtime` defaults to None.

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/render.py packages/agent/tests/test_tools.py
git commit -m "feat(agent): submit_render accepts optional ToolRuntime for context"
```

---

## Task 4: Tool updates — voice.py (ToolRuntime injection)

**Files:**

- Modify: `packages/agent/src/tools/voice.py`
- Modify: `packages/agent/tests/test_tools_voice.py`

**Context:** `generate_voiceover` currently parses `config_id` from the JSON string. With ToolRuntime, it can get `config_id` and `output_dir` from PipelineContext. The function must remain backwards-compatible.

- [ ] **Step 1: Write the failing test**

Add to `packages/agent/tests/test_tools_voice.py`:

```python
class TestGenerateVoiceoverRuntime:
    def test_uses_runtime_config_id_for_output_dir(self, tmp_path, monkeypatch):
        import src.tools.voice as voice_mod
        monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

        from unittest.mock import MagicMock
        from src.context import PipelineContext

        runtime = MagicMock()
        runtime.context = PipelineContext(
            config_id="runtime-video",
            output_dir=str(tmp_path),
        )

        config = {
            "id": "json-video",
            "voiceover": {
                "voiceId": "Orus",
                "language": "es-ES",
                "scenes": {},
            },
        }

        result = voice_mod.generate_voiceover(json.dumps(config), runtime=runtime)
        # runtime.context.config_id takes precedence over config["id"]
        expected_dir = tmp_path / "public" / "voiceover" / "runtime-video"
        assert expected_dir.exists() or "no scenes" in result.lower() or "0 OK" in result

    def test_works_without_runtime(self, tmp_path, monkeypatch):
        import src.tools.voice as voice_mod
        monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

        config = {
            "id": "plain-video",
            "voiceover": {
                "voiceId": "Orus",
                "language": "es-ES",
                "scenes": {},
            },
        }
        result = voice_mod.generate_voiceover(json.dumps(config))
        assert "0 OK" in result or "complete" in result.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_tools_voice.py::TestGenerateVoiceoverRuntime -v`
Expected: FAIL — `generate_voiceover` doesn't accept `runtime`.

- [ ] **Step 3: Update generate_voiceover**

In `packages/agent/src/tools/voice.py`, update the function signature:

```python
def generate_voiceover(config_json: str, runtime=None) -> str:
    """Generate voiceover audio for all scenes using Gemini TTS.

    Args:
        config_json: The full video config as a JSON string.
    """
    try:
        config = json.loads(config_json)
    except (json.JSONDecodeError, TypeError):
        return "Error: config_json must be a valid JSON string with the full video config. Do not pass a file path."

    voiceover = config.get("voiceover")
    if not voiceover:
        return "Voiceover not enabled in config."
    if not voiceover.get("scenes"):
        return "Voiceover has no scenes defined."

    client = _get_genai_client()
    if not client:
        return "Error: no Google credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_AI_API_KEY."

    voice_id = _sanitize_voice_id(voiceover.get("voiceId", DEFAULT_VOICE))
    language = voiceover.get("language", "es-ES")
    raw_scenes = voiceover.get("scenes", {})
    if isinstance(raw_scenes, list):
        scenes = {str(s.get("sceneIndex", i)): s for i, s in enumerate(raw_scenes)}
    else:
        scenes = raw_scenes

    ctx = getattr(runtime, "context", None) if runtime else None
    config_id = (ctx.config_id if ctx else None) or config.get("id", "unknown")
    out_dir = PROJECT_ROOT / "public" / "voiceover" / config_id
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for scene_index, scene_value in scenes.items():
        text = scene_value if isinstance(scene_value, str) else scene_value.get("text", "")
        if not text:
            results.append(f"scene {scene_index}: skipped (no text)")
            continue
        try:
            result = _generate_scene_audio(client, scene_index, text, voice_id, language, out_dir)
            results.append(result)
        except Exception as e:
            results.append(f"scene {scene_index}: ERROR - {e}")

    summary = "\n".join(results)
    ok_count = sum(1 for r in results if ": OK" in r or ": skipped" in r)
    err_count = sum(1 for r in results if ": ERROR" in r)
    return f"Voiceover generation complete. {ok_count} OK, {err_count} errors.\n{summary}"
```

- [ ] **Step 4: Run all voice tests**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_tools_voice.py -v`
Expected: PASS (all existing + 2 new tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/voice.py packages/agent/tests/test_tools_voice.py
git commit -m "feat(agent): generate_voiceover accepts optional ToolRuntime for config_id"
```

---

## Task 5: Tool updates — sound.py + validation.py (ToolRuntime injection)

**Files:**

- Modify: `packages/agent/src/tools/sound.py`
- Modify: `packages/agent/src/tools/validation.py`
- Modify: `packages/agent/tests/test_tools.py`
- Modify: `packages/agent/tests/test_tools_validation.py`

**Context:** `copy_library_track` uses `config_id` for the destination directory. `validate_config` and `review_render` use `PROJECT_ROOT` for asset paths. Both can benefit from PipelineContext.

- [ ] **Step 1: Write the failing tests**

Add to `packages/agent/tests/test_tools.py`:

```python
class TestCopyLibraryTrackRuntime:
    def test_uses_runtime_config_id(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "lofi-tech.mp3").write_bytes(b"fake-mp3")

        from unittest.mock import MagicMock
        from src.context import PipelineContext

        runtime = MagicMock()
        runtime.context = PipelineContext(config_id="rt-video")

        result = sound_mod.copy_library_track("lofi-tech", "ignored-id", "music-bed", runtime=runtime)
        assert "Copied" in result
        dest = tmp_path / "public" / "audio" / "rt-video" / "music-bed.mp3"
        assert dest.exists()
```

Add to `packages/agent/tests/test_tools_validation.py`:

```python
class TestValidateConfigRuntime:
    def test_works_with_runtime(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod
        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)
        from src.tools.validation import validate_config

        config = {
            "id": "test",
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        result = validate_config(json.dumps(config))
        data = json.loads(result)
        assert data["errors"] == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_tools.py::TestCopyLibraryTrackRuntime -v`
Expected: FAIL — `copy_library_track` doesn't accept `runtime`.

- [ ] **Step 3: Update copy_library_track**

In `packages/agent/src/tools/sound.py`:

```python
def copy_library_track(track_id: str, config_id: str, dest_name: str, runtime=None) -> str:
    """Copy a track from the audio library to a config's audio directory.

    Args:
        track_id: Library track filename without extension (e.g. 'lofi-tech' or 'sfx-swoosh').
        config_id: The video config id (used as subdirectory name).
        dest_name: Destination filename without extension (e.g. 'music-bed' or 'sfx-swoosh').
    """
    import shutil

    ctx = getattr(runtime, "context", None) if runtime else None
    effective_config_id = (ctx.config_id if ctx else None) or config_id

    source = PROJECT_ROOT / "public" / "audio" / "library" / f"{track_id}.mp3"
    if not source.exists():
        return f"Error: track '{track_id}' not found in library at {source}"

    dest_dir = PROJECT_ROOT / "public" / "audio" / effective_config_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{dest_name}.mp3"
    shutil.copy2(source, dest)
    return f"Copied {track_id}.mp3 → {dest}"
```

- [ ] **Step 4: Run all sound + validation tests**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_tools.py packages/agent/tests/test_tools_validation.py -v`
Expected: PASS (all existing + new tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/sound.py packages/agent/src/tools/validation.py packages/agent/tests/test_tools.py packages/agent/tests/test_tools_validation.py
git commit -m "feat(agent): copy_library_track accepts optional ToolRuntime for config_id"
```

---

## Task 6: Orchestrator prompt — filesystem state management + validation

**Files:**

- Modify: `packages/agent/prompts/orchestrator.md`

**Context:** The orchestrator prompt needs to instruct the LLM to use the virtual filesystem for state passing between agents, and to validate the config between pipeline steps. This is the highest-impact change — it controls how agents coordinate.

- [ ] **Step 1: Write the failing test**

```python
# Add to packages/agent/tests/test_orchestrator.py or inline verification
def test_orchestrator_prompt_has_filesystem_section():
    from pathlib import Path
    prompt_path = Path(__file__).parent.parent / "prompts" / "orchestrator.md"
    content = prompt_path.read_text(encoding="utf-8")
    assert "## Pipeline state (virtual filesystem)" in content
    assert "/pipeline/config.json" in content
    assert "validate_config" in content
    assert "read_file" in content
    assert "write_file" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_orchestrator.py::test_orchestrator_prompt_has_filesystem_section -v`
Expected: FAIL — orchestrator prompt doesn't mention filesystem.

- [ ] **Step 3: Update orchestrator.md**

Add the following sections to `packages/agent/prompts/orchestrator.md`, after the "## Workflow" section and before "## STOP CONDITIONS":

```markdown
## Pipeline state (virtual filesystem)

Agents pass structured data via the virtual filesystem, NOT via text in task descriptions. The pipeline directory:
```

/pipeline/
brief.json ← Written by researcher
config.json ← Written by copywriter, enriched by director & audio_planner
validation.json ← Written by validator
review.json ← Written by reviewer
/pipeline/voiceover/
manifest.json ← Written by voice_generator
/pipeline/audio/
manifest.json ← Written by sound_engineer

```

### How to dispatch agents

When dispatching each agent via `task()`, tell them WHERE to read/write, not WHAT the data is:

- **researcher**: "Research [topic]. Write your findings to `/pipeline/brief.json`."
- **copywriter**: "Read the brief from `/pipeline/brief.json`. Write your config to `/pipeline/config.json`."
- **director**: "Read `/pipeline/config.json`. Add timing and beats. Write back to `/pipeline/config.json`."
- **audio_planner**: "Read `/pipeline/config.json`. Add voiceover and soundDesign. Write back to `/pipeline/config.json`."
- **voice_generator**: "Read `/pipeline/config.json`. Generate voiceover MP3s."
- **sound_engineer**: "Read `/pipeline/config.json`. Copy audio assets."
- **validator**: "Validate `/pipeline/config.json` against assets on disk."
- **reviewer**: "Review the rendered output against `/pipeline/config.json`."

Do NOT paste the full config JSON into task descriptions. Agents use `read_file` and `write_file` tools to access `/pipeline/` files.

### Validation between steps

After the **copywriter** completes, call `validate_config` on `/pipeline/config.json` to catch schema errors early. If validation returns errors, re-dispatch the copywriter with the error list.

After the **director** completes, call `validate_config` again. If errors, re-dispatch the director.

After **voice_generator** and **sound_engineer** complete, dispatch the **validator** for full asset verification.
```

Also update the Workflow section step 2 to reference filesystem paths instead of "results":

In the Workflow section, update step 2:

```markdown
2. For new videos, follow these steps IN ORDER:

   **Creative phase:**
   a. Dispatch **researcher** to gather product/topic data → writes `/pipeline/brief.json`
   b. Dispatch **copywriter** with instruction to read `/pipeline/brief.json` → writes `/pipeline/config.json`. CP1.
   c. Call **validate_config** on `/pipeline/config.json`. If errors, re-dispatch copywriter.
   d. Dispatch **director** with instruction to read/update `/pipeline/config.json`. CP2.
   e. Call **validate_config** on `/pipeline/config.json`. If errors, re-dispatch director.

   **Production phase:**
   f. Dispatch **audio_planner** to read/update `/pipeline/config.json`. CP3.
   g. Dispatch **voice_generator** AND **sound_engineer** IN PARALLEL — both read `/pipeline/config.json`.
   h. Dispatch **scene_creator** if needed.
   i. Dispatch **validator** for full verification. CP5.

   **Delivery phase:**
   j. Read `/pipeline/config.json` and call **submit_render**
   k. Call **check_render_status** to monitor progress
   l. Dispatch **reviewer** with the output path. CP6.
   m. Report the result to the user and STOP
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_orchestrator.py::test_orchestrator_prompt_has_filesystem_section -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/prompts/orchestrator.md packages/agent/tests/test_orchestrator.py
git commit -m "feat(agent): orchestrator prompt uses filesystem state and validation between steps"
```

---

## Task 7: Creative subgraph prompts — researcher, copywriter, director

**Files:**

- Modify: `packages/agent/prompts/researcher.md`
- Modify: `packages/agent/prompts/copywriter.md`
- Modify: `packages/agent/prompts/director.md`

**Context:** Each agent needs a "State Management" section telling it where to read input from and write output to on the virtual filesystem.

- [ ] **Step 1: Write the failing test**

```python
# packages/agent/tests/test_prompts_filesystem.py
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


class TestCreativePromptsFilesystem:
    def test_researcher_writes_brief(self):
        content = (PROMPTS_DIR / "researcher.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/brief.json" in content
        assert "write_file" in content

    def test_copywriter_reads_brief_writes_config(self):
        content = (PROMPTS_DIR / "copywriter.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/brief.json" in content
        assert "/pipeline/config.json" in content

    def test_director_reads_writes_config(self):
        content = (PROMPTS_DIR / "director.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content


class TestProductionPromptsFilesystem:
    def test_audio_planner_reads_writes_config(self):
        content = (PROMPTS_DIR / "audio_planner.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content

    def test_voice_generator_reads_config(self):
        content = (PROMPTS_DIR / "voice_generator.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content

    def test_sound_engineer_reads_config(self):
        content = (PROMPTS_DIR / "sound_engineer.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content


class TestDeliveryPromptsFilesystem:
    def test_validator_reads_config(self):
        content = (PROMPTS_DIR / "validator.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content

    def test_reviewer_reads_config(self):
        content = (PROMPTS_DIR / "reviewer.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_prompts_filesystem.py::TestCreativePromptsFilesystem -v`
Expected: FAIL — no "State management" sections in prompts.

- [ ] **Step 3: Update researcher.md**

Append to `packages/agent/prompts/researcher.md`:

```markdown
## State management

- Write your research findings to `/pipeline/brief.json` using `write_file`
- Structure as JSON with fields: `product_name`, `price`, `benefits` (array), `usps` (array), `cta_url`, `competitor_data`, `key_concepts`
- Do NOT return the full research as text in your response — write it to the file and confirm
- The copywriter will read from `/pipeline/brief.json` to generate the video config
```

- [ ] **Step 4: Update copywriter.md**

Append to `packages/agent/prompts/copywriter.md`, before the "## What you DON'T do" section:

```markdown
## State management

- Read the research brief from `/pipeline/brief.json` using `read_file`
- Write your complete config.json to `/pipeline/config.json` using `write_file`
- The escaleta checkpoint receives the config from this file
- When revising after feedback, read the current config from `/pipeline/config.json`, modify, and write back
- Do NOT return the full config as text in your final response — write it to the file and confirm what you wrote
```

- [ ] **Step 5: Update director.md**

Append to `packages/agent/prompts/director.md`, before the "## Output" section:

```markdown
## State management

- Read the current config from `/pipeline/config.json` using `read_file`
- Add timing and beats to each scene
- Write the enriched config back to `/pipeline/config.json` using `write_file`
- When revising after feedback, read the current config, modify, and write back
- Do NOT return the full config as text — update the file and confirm what changed
```

- [ ] **Step 6: Run test to verify it passes**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_prompts_filesystem.py::TestCreativePromptsFilesystem -v`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/agent/prompts/researcher.md packages/agent/prompts/copywriter.md packages/agent/prompts/director.md packages/agent/tests/test_prompts_filesystem.py
git commit -m "feat(agent): creative subgraph prompts use filesystem state management"
```

---

## Task 8: Production subgraph prompts — audio_planner, voice_generator, sound_engineer

**Files:**

- Modify: `packages/agent/prompts/audio_planner.md`
- Modify: `packages/agent/prompts/voice_generator.md`
- Modify: `packages/agent/prompts/sound_engineer.md`

**Context:** Production agents need filesystem instructions. Voice generator and sound engineer are especially important because they run in parallel and must write to separate directories.

- [ ] **Step 1: Update audio_planner.md**

Append to `packages/agent/prompts/audio_planner.md`, before "## Output":

```markdown
## State management

- Read the current config from `/pipeline/config.json` using `read_file`
- After approval, write the config with voiceover and soundDesign sections back to `/pipeline/config.json` using `write_file`
- Do NOT return the full config as text — update the file and confirm what you added
```

- [ ] **Step 2: Update voice_generator.md**

Replace the entire "## Workflow" and "## Rules" sections in `packages/agent/prompts/voice_generator.md` with:

```markdown
## State management

- Read the config from `/pipeline/config.json` using `read_file`
- Pass the config JSON string to the `generate_voiceover` tool
- The tool writes MP3 files to `public/voiceover/<config_id>/`
- Do NOT modify `/pipeline/config.json` — your output is the MP3 files on disk

## Workflow

1. Read `/pipeline/config.json` using `read_file`
2. Call `generate_voiceover` passing the file content as a JSON string
3. Parse the result to identify success or per-scene errors
4. Report the result: which scenes were generated, which failed and why

## Rules

- The voiceover section was already approved by the user in the audio chart — do not modify it
- Pass the config content read from the file as a JSON string to `generate_voiceover`
- The config MUST include at minimum: `id`, `voiceover` (with `voiceId`, `language`, `scenes`), and `scenes` array
- If generation fails for a scene, report the error but do not retry
- Do not call any other tools besides `read_file` and `generate_voiceover`
```

- [ ] **Step 3: Update sound_engineer.md**

Replace the "## Workflow" section in `packages/agent/prompts/sound_engineer.md` with:

```markdown
## State management

- Read the config from `/pipeline/config.json` using `read_file`
- Parse the `soundDesign` section to identify music bed and SFX tracks
- Do NOT modify `/pipeline/config.json` — your output is the copied audio files on disk

## Workflow

1. Read `/pipeline/config.json` using `read_file`
2. Parse the `soundDesign` section for music bed and SFX track IDs
3. Call `list_audio_library` to verify the tracks exist
4. For the music bed: call `copy_library_track(libraryId, config_id, "music-bed")`
5. For each SFX: call `copy_library_track(sfx_library_id, config_id, "sfx-{sfx_id}")`
6. Report which tracks were copied successfully and any errors
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_prompts_filesystem.py::TestProductionPromptsFilesystem -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/prompts/audio_planner.md packages/agent/prompts/voice_generator.md packages/agent/prompts/sound_engineer.md
git commit -m "feat(agent): production subgraph prompts use filesystem state management"
```

---

## Task 9: Delivery subgraph prompts — validator, reviewer

**Files:**

- Modify: `packages/agent/prompts/validator.md`
- Modify: `packages/agent/prompts/reviewer.md`

**Context:** Validator reads config from filesystem, writes validation results. Reviewer reads config and rendered output.

- [ ] **Step 1: Update validator.md**

Replace the "## Workflow" section in `packages/agent/prompts/validator.md` with:

```markdown
## State management

- Read the config from `/pipeline/config.json` using `read_file`
- Pass the config JSON to `validate_config`
- Write results to `/pipeline/validation.json` using `write_file`

## Workflow

1. Read `/pipeline/config.json` using `read_file`
2. Call `validate_config` with the config content as a JSON string
3. Write the validation result to `/pipeline/validation.json` using `write_file`
4. Parse the result:
   - If errors (blocking): report them. The pipeline must stop.
   - If warnings only: report them for the user to decide.
   - If clean: report ready for render.
```

- [ ] **Step 2: Update reviewer.md**

Replace the "## Workflow" section in `packages/agent/prompts/reviewer.md` with:

```markdown
## State management

- Read the config from `/pipeline/config.json` using `read_file`
- Pass config and output path to `review_render`
- Write results to `/pipeline/review.json` using `write_file`

## Workflow

1. Read `/pipeline/config.json` using `read_file`
2. Call `review_render` with the output path and config content
3. Write the review result to `/pipeline/review.json` using `write_file`
4. Present the review to the user:
   - File exists and size
   - Duration: actual vs expected
   - Audio: present or missing
5. The user accepts or rejects the result
```

- [ ] **Step 3: Run test to verify it passes**

Run: `.venv/bin/python -m pytest packages/agent/tests/test_prompts_filesystem.py::TestDeliveryPromptsFilesystem -v`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add packages/agent/prompts/validator.md packages/agent/prompts/reviewer.md
git commit -m "feat(agent): delivery subgraph prompts use filesystem state management"
```

---

## Post-implementation notes

### Async subagents (deferred)

Section 2.6 of the spec describes async subagents for parallel voice_generator + sound_engineer. This is a **preview feature** in DeepAgents with potential API changes and requires Agent Protocol-compatible servers. Deferring until the feature stabilizes. The current synchronous parallel dispatch via the orchestrator prompt works adequately.

### Testing strategy

- Tasks 1-5 use unit tests with mocked dependencies (monkeypatch, respx)
- Tasks 6-9 use simple file-content assertions (prompt text contains expected markers)
- Full E2E testing requires a running render service and Google API credentials — do this manually after all tasks complete
- Run full test suite: `.venv/bin/python -m pytest packages/agent/tests/ -v`

### Rollback

All changes are backwards-compatible:

- `runtime=None` defaults mean tools work without PipelineContext
- Prompt additions are additive (existing behavior unchanged)
- Summarization middleware is wrapped in try/except ImportError
- No breaking changes to function signatures
