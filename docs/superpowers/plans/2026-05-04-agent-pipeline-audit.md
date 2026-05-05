# Agent Pipeline Audit & Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 confirmed bugs in the video generation agent pipeline so a single E2E run produces a video with voiceover AND background music without manual intervention.

**Architecture:** Phase 1 fixes code-level bugs in Python tools, TypeScript schemas, and agent prompts. Phase 2 (separate plan) will adopt idiomatic DeepAgents patterns.

**Tech Stack:** Python 3.12, pytest, DeepAgents/LangGraph, Zod (TypeScript), Remotion

---

## File Structure

### Files to modify

| File                                        | Responsibility                        | Tasks   |
| ------------------------------------------- | ------------------------------------- | ------- |
| `packages/agent/src/tools/sound.py`         | Audio library listing + track copying | 1       |
| `packages/agent/src/tools/voice.py`         | Voiceover generation via Gemini TTS   | 2, 3, 4 |
| `packages/agent/src/tools/render.py`        | Render submission + status polling    | 5       |
| `src/shared/schemas/direction.ts`           | Zod schema for beats/timing           | 6       |
| `packages/agent/prompts/orchestrator.md`    | Orchestrator system prompt            | 7       |
| `packages/agent/prompts/audio_planner.md`   | Audio planner system prompt           | 4       |
| `packages/agent/prompts/voice_generator.md` | Voice generator system prompt         | 4       |
| `packages/agent/src/orchestrator.py`        | Graph creation + model setup          | 8       |
| `packages/agent/graph_server.py`            | LangGraph dev entry point             | 8       |

### Test files to modify

| File                                            | Tasks               |
| ----------------------------------------------- | ------------------- |
| `packages/agent/tests/test_tools.py`            | 1, 5                |
| `packages/agent/tests/test_tools_voice.py`      | 2, 3, 4             |
| `packages/agent/tests/test_tools_validation.py` | (no changes needed) |

---

### Task 1: Fix `list_audio_library()` — searches directories instead of files

**Files:**

- Modify: `packages/agent/src/tools/sound.py:12`
- Modify: `packages/agent/tests/test_tools.py` (add new test class)

- [ ] **Step 1: Write failing test for `list_audio_library()`**

Add this test class at the end of `packages/agent/tests/test_tools.py`:

```python
class TestListAudioLibrary:
    def test_lists_mp3_files_not_dirs(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "lofi-tech.mp3").write_bytes(b"fake")
        (library_dir / "lofi-tech-2.mp3").write_bytes(b"fake")
        (library_dir / "some-dir").mkdir()

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        import json
        tracks = json.loads(result)
        assert tracks == ["lofi-tech", "lofi-tech-2"]

    def test_returns_stems_without_extension(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "track-one.mp3").write_bytes(b"fake")

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        import json
        tracks = json.loads(result)
        assert tracks == ["track-one"]
        assert ".mp3" not in tracks[0]

    def test_ignores_non_mp3_files(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "track.mp3").write_bytes(b"fake")
        (library_dir / "readme.txt").write_text("info")
        (library_dir / ".DS_Store").write_bytes(b"x")

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        import json
        tracks = json.loads(result)
        assert tracks == ["track"]

    def test_empty_library(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        assert result == "No tracks found."

    def test_missing_library_dir(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        assert "No audio library" in result
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && python -m pytest tests/test_tools.py::TestListAudioLibrary -v`

Expected: 3 FAILs (the tests expecting stems will get directory names or empty results), 2 PASSes (empty/missing dir cases may already work).

- [ ] **Step 3: Fix `list_audio_library()` in sound.py**

Replace line 12 in `packages/agent/src/tools/sound.py`:

```python
    tracks = sorted(d.name for d in library_dir.iterdir() if d.is_dir())
```

With:

```python
    tracks = sorted(d.stem for d in library_dir.iterdir() if d.is_file() and d.suffix == ".mp3")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agent && python -m pytest tests/test_tools.py::TestListAudioLibrary -v`

Expected: All 5 PASS.

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `cd packages/agent && python -m pytest tests/ -v`

Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/agent/src/tools/sound.py packages/agent/tests/test_tools.py
git commit -m "fix(agent): list_audio_library searches files not directories

The function used d.is_dir() instead of d.is_file(), so it never found
MP3 tracks. Returns stems without extension for copy_library_track compat."
```

---

### Task 2: Clean up base64 handling in voice.py

**Files:**

- Modify: `packages/agent/src/tools/voice.py:106-112`
- Modify: `packages/agent/tests/test_tools_voice.py` (add test)

- [ ] **Step 1: Write failing test for base64 string path**

Add this test to `packages/agent/tests/test_tools_voice.py`:

```python
class TestGenerateSceneAudioDataHandling:
    def test_handles_bytes_directly(self, tmp_path):
        """When Gemini returns bytes, write them directly without base64 decode."""
        from src.tools.voice import _generate_scene_audio

        class FakeAudioPart:
            class inline_data:
                data = b"\x00\x01" * 100  # raw PCM bytes

        class FakeCandidate:
            class content:
                parts = [FakeAudioPart()]

        class FakeResponse:
            candidates = [FakeCandidate()]

        class FakeClient:
            class models:
                @staticmethod
                def generate_content(**kwargs):
                    return FakeResponse()

        # Mock _pcm_to_mp3 to avoid needing ffmpeg
        import src.tools.voice as voice_mod
        original_pcm_to_mp3 = voice_mod._pcm_to_mp3
        def fake_pcm_to_mp3(pcm_path, mp3_path):
            mp3_path.write_bytes(pcm_path.read_bytes())
            pcm_path.unlink(missing_ok=True)
        voice_mod._pcm_to_mp3 = fake_pcm_to_mp3

        try:
            result = _generate_scene_audio(FakeClient(), "0", "Hello", "Orus", "es-ES", tmp_path)
            assert "OK" in result
            assert (tmp_path / "0.mp3").exists()
        finally:
            voice_mod._pcm_to_mp3 = original_pcm_to_mp3

    def test_handles_base64_string(self, tmp_path):
        """When Gemini returns a base64 string, decode it properly."""
        import base64
        from src.tools.voice import _generate_scene_audio

        raw_pcm = b"\x00\x01" * 100
        b64_string = base64.b64encode(raw_pcm).decode("ascii")

        class FakeAudioPart:
            class inline_data:
                data = b64_string  # base64-encoded string

        class FakeCandidate:
            class content:
                parts = [FakeAudioPart()]

        class FakeResponse:
            candidates = [FakeCandidate()]

        class FakeClient:
            class models:
                @staticmethod
                def generate_content(**kwargs):
                    return FakeResponse()

        import src.tools.voice as voice_mod
        def fake_pcm_to_mp3(pcm_path, mp3_path):
            mp3_path.write_bytes(pcm_path.read_bytes())
            pcm_path.unlink(missing_ok=True)
        original = voice_mod._pcm_to_mp3
        voice_mod._pcm_to_mp3 = fake_pcm_to_mp3

        try:
            result = _generate_scene_audio(FakeClient(), "0", "Hello", "Orus", "es-ES", tmp_path)
            assert "OK" in result
        finally:
            voice_mod._pcm_to_mp3 = original

    def test_rejects_unexpected_type(self, tmp_path):
        """When Gemini returns an unexpected type, raise ValueError."""
        from src.tools.voice import _generate_scene_audio

        class FakeAudioPart:
            class inline_data:
                data = 12345  # unexpected type

        class FakeCandidate:
            class content:
                parts = [FakeAudioPart()]

        class FakeResponse:
            candidates = [FakeCandidate()]

        class FakeClient:
            class models:
                @staticmethod
                def generate_content(**kwargs):
                    return FakeResponse()

        result = _generate_scene_audio(FakeClient(), "0", "Hello", "Orus", "es-ES", tmp_path)
        assert "ERROR" in result
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && python -m pytest tests/test_tools_voice.py::TestGenerateSceneAudioDataHandling -v`

Expected: At least the `test_rejects_unexpected_type` test fails (current code converts any type to string).

- [ ] **Step 3: Fix base64 handling in voice.py**

Replace lines 106-112 in `packages/agent/src/tools/voice.py`:

```python
    audio_part = response.candidates[0].content.parts[0]
    raw = audio_part.inline_data.data
    if isinstance(raw, bytes):
        padded = str(raw) + "=" * (-len(str(raw)) % 4)
        pcm_data = base64.b64decode(padded)
    else:
        pcm_data = raw
```

With:

```python
    audio_part = response.candidates[0].content.parts[0]
    raw = audio_part.inline_data.data
    if isinstance(raw, bytes):
        pcm_data = raw
    elif isinstance(raw, str):
        padded = raw + "=" * (-len(raw) % 4)
        pcm_data = base64.b64decode(padded)
    else:
        raise ValueError(f"Unexpected audio data type: {type(raw)}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agent && python -m pytest tests/test_tools_voice.py::TestGenerateSceneAudioDataHandling -v`

Expected: All 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/voice.py packages/agent/tests/test_tools_voice.py
git commit -m "fix(agent): clean up base64 handling in voice.py

Bytes are written directly, strings are base64-decoded, unexpected types
raise ValueError instead of silently converting via str()."
```

---

### Task 3: Make ffmpeg fail-fast with FFMPEG_PATH support

**Files:**

- Modify: `packages/agent/src/tools/voice.py:24-37`
- Modify: `packages/agent/tests/test_tools_voice.py` (add test)

- [ ] **Step 1: Write failing test for FFMPEG_PATH env var**

Add to `packages/agent/tests/test_tools_voice.py`:

```python
class TestFindFfmpeg:
    def test_uses_ffmpeg_path_env_var(self, tmp_path, monkeypatch):
        ffmpeg_bin = tmp_path / "custom-ffmpeg"
        ffmpeg_bin.write_text("#!/bin/sh\n")
        monkeypatch.setenv("FFMPEG_PATH", str(ffmpeg_bin))

        from src.tools.voice import _find_ffmpeg
        assert _find_ffmpeg() == str(ffmpeg_bin)

    def test_uses_system_ffmpeg_when_no_env(self, monkeypatch):
        monkeypatch.delenv("FFMPEG_PATH", raising=False)
        import shutil
        if shutil.which("ffmpeg"):
            from src.tools.voice import _find_ffmpeg
            result = _find_ffmpeg()
            assert "ffmpeg" in result.lower()

    def test_raises_when_not_found(self, monkeypatch):
        monkeypatch.delenv("FFMPEG_PATH", raising=False)
        monkeypatch.setattr("shutil.which", lambda x: None)

        from src.tools.voice import _find_ffmpeg
        with pytest.raises(FileNotFoundError, match="ffmpeg not found"):
            _find_ffmpeg()
```

- [ ] **Step 2: Run tests to verify `test_raises_when_not_found` fails**

Run: `cd packages/agent && python -m pytest tests/test_tools_voice.py::TestFindFfmpeg::test_raises_when_not_found -v`

Expected: FAIL (current code returns string `"ffmpeg"` instead of raising).

- [ ] **Step 3: Rewrite `_find_ffmpeg()` in voice.py**

Replace lines 24-37 in `packages/agent/src/tools/voice.py`:

```python
def _find_ffmpeg() -> str:
    import shutil

    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    ffmpeg_bundled = PROJECT_ROOT / "node_modules" / "@remotion" / "compositor-win32-x64-msvc" / "ffmpeg.exe"
    if ffmpeg_bundled.exists():
        return str(ffmpeg_bundled)
    for suffix in ("linux-x64-gnu", "darwin-arm64", "darwin-x64"):
        candidate = PROJECT_ROOT / "node_modules" / "@remotion" / f"compositor-{suffix}" / "ffmpeg"
        if candidate.exists():
            return str(candidate)
    return "ffmpeg"
```

With:

```python
def _find_ffmpeg() -> str:
    import shutil

    env_path = os.environ.get("FFMPEG_PATH")
    if env_path:
        return env_path
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    raise FileNotFoundError("ffmpeg not found in PATH. Install ffmpeg or set FFMPEG_PATH env var.")
```

- [ ] **Step 4: Run all ffmpeg tests**

Run: `cd packages/agent && python -m pytest tests/test_tools_voice.py::TestFindFfmpeg -v`

Expected: All PASS (or skip the system-ffmpeg test if not installed).

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/voice.py packages/agent/tests/test_tools_voice.py
git commit -m "fix(agent): ffmpeg fail-fast with FFMPEG_PATH env var support

Remove Remotion bundled ffmpeg fallback (doesn't work cross-directory).
Raise FileNotFoundError immediately instead of returning bare string."
```

---

### Task 4: Fix voiceover.enabled gate + audio_planner prompt

**Files:**

- Modify: `packages/agent/src/tools/voice.py:134-136`
- Modify: `packages/agent/prompts/audio_planner.md`
- Modify: `packages/agent/prompts/voice_generator.md`
- Modify: `packages/agent/tests/test_tools_voice.py` (add test)

- [ ] **Step 1: Write failing test — voiceover without `enabled` flag should still generate**

Add to `packages/agent/tests/test_tools_voice.py`:

```python
class TestGenerateVoiceoverEnabledGate:
    def test_generates_when_voiceover_has_scenes_but_no_enabled(self, monkeypatch):
        """If voiceover config has scenes, generate even without enabled: true."""
        import src.tools.voice as voice_mod
        monkeypatch.setattr(voice_mod, "_get_genai_client", lambda: None)

        config = {
            "id": "test",
            "voiceover": {
                "provider": "gemini",
                "voiceId": "Orus",
                "language": "es-ES",
                "scenes": {"0": {"text": "Hello"}},
            },
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        import json
        result = voice_mod.generate_voiceover(json.dumps(config))
        # Should try to generate (fail on credentials), not return "not enabled"
        assert "not enabled" not in result.lower()

    def test_returns_early_when_no_voiceover_section(self):
        """If there's no voiceover section at all, return early."""
        import json
        from src.tools.voice import generate_voiceover
        config = {"id": "test", "scenes": [{"type": "intro", "durationInSeconds": 3}]}
        result = generate_voiceover(json.dumps(config))
        assert "not enabled" in result.lower() or "no voiceover" in result.lower()

    def test_returns_early_when_no_scenes_in_voiceover(self):
        """If voiceover section has no scenes, return early."""
        import json
        from src.tools.voice import generate_voiceover
        config = {
            "id": "test",
            "voiceover": {"provider": "gemini", "voiceId": "Orus"},
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        result = generate_voiceover(json.dumps(config))
        assert "no scenes" in result.lower()
```

- [ ] **Step 2: Run tests to verify first test fails**

Run: `cd packages/agent && python -m pytest tests/test_tools_voice.py::TestGenerateVoiceoverEnabledGate -v`

Expected: `test_generates_when_voiceover_has_scenes_but_no_enabled` FAILS (current code checks `enabled` flag).

- [ ] **Step 3: Fix the `enabled` gate in voice.py**

Replace lines 134-136 in `packages/agent/src/tools/voice.py`:

```python
    voiceover = config.get("voiceover")
    if not voiceover or not voiceover.get("enabled"):
        return "Voiceover not enabled in config."
```

With:

```python
    voiceover = config.get("voiceover")
    if not voiceover:
        return "Voiceover not enabled in config."
    if not voiceover.get("scenes"):
        return "Voiceover has no scenes defined."
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agent && python -m pytest tests/test_tools_voice.py::TestGenerateVoiceoverEnabledGate -v`

Expected: All 3 PASS.

- [ ] **Step 5: Update audio_planner prompt to always include `enabled: true`**

Add the following line at the end of the "Critical rules" section in `packages/agent/prompts/audio_planner.md` (after line 24):

```markdown
- ALWAYS include `"enabled": true` in the voiceover section — the Zod schema requires it for render validation
```

- [ ] **Step 6: Update voice_generator prompt to clarify `enabled` is optional at tool level**

Replace line 12 in `packages/agent/prompts/voice_generator.md`:

```markdown
- The config MUST include at minimum: `id`, `voiceover` (with `enabled`, `voiceId`, `language`, `scenes`), and `scenes` array
```

With:

```markdown
- The config MUST include at minimum: `id`, `voiceover` (with `voiceId`, `language`, `scenes`), and `scenes` array. The `enabled` field is optional for the tool but required by the render schema.
```

- [ ] **Step 7: Run full test suite**

Run: `cd packages/agent && python -m pytest tests/ -v`

Expected: All PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/agent/src/tools/voice.py packages/agent/tests/test_tools_voice.py packages/agent/prompts/audio_planner.md packages/agent/prompts/voice_generator.md
git commit -m "fix(agent): voiceover generates when scenes exist, regardless of enabled flag

The generate_voiceover tool now checks for scenes presence instead of
enabled: true. Prompt updated to always include enabled for Zod compat."
```

---

### Task 5: Fix submit_render defaults to Tutorial dimensions

**Files:**

- Modify: `packages/agent/src/tools/render.py:59-68`
- Modify: `packages/agent/tests/test_tools.py` (add test)

- [ ] **Step 1: Write failing test — default dimensions should be 1280x720**

Add to `packages/agent/tests/test_tools.py` inside `TestSubmitRender`:

```python
    @respx.mock
    def test_default_dimensions_are_tutorial(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        submit_render(id="test", scenes=[{"type": "intro", "durationInSeconds": 3}])
        body = json.loads(route.calls[0].request.content)
        assert body["width"] == 1280
        assert body["height"] == 720

    @respx.mock
    def test_default_composition_is_not_product_short(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        submit_render(id="test", scenes=[{"type": "intro", "durationInSeconds": 3}])
        body = json.loads(route.calls[0].request.content)
        assert "composition" not in body
        assert "title" in body
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && python -m pytest tests/test_tools.py::TestSubmitRender::test_default_dimensions_are_tutorial tests/test_tools.py::TestSubmitRender::test_default_composition_is_not_product_short -v`

Expected: Both FAIL (current defaults are 1080x1920 and "ProductShort").

- [ ] **Step 3: Fix defaults in render.py**

Replace lines 59-68 in `packages/agent/src/tools/render.py`:

```python
def submit_render(
    id: str,
    scenes: list[dict],
    title: str = "",
    description: str = "",
    fps: int = 30,
    width: int = 1080,
    height: int = 1920,
    theme: str = "linea-directa",
    composition: str = "ProductShort",
```

With:

```python
def submit_render(
    id: str,
    scenes: list[dict],
    title: str = "",
    description: str = "",
    fps: int = 30,
    width: int = 1280,
    height: int = 720,
    theme: str = "linea-directa",
    composition: str = "",
```

- [ ] **Step 4: Run all render tests**

Run: `cd packages/agent && python -m pytest tests/test_tools.py::TestSubmitRender -v`

Expected: All PASS. Note: `test_submit_render_success` already passes explicit 1280x720 so won't break.

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/render.py packages/agent/tests/test_tools.py
git commit -m "fix(agent): default render dimensions to Tutorial (1280x720)

ProductShort (1080x1920) was the default but Tutorial is the primary
workflow. Empty composition string means ClaudeCodeTutorial in render service."
```

---

### Task 6: Make BeatSchema text fields optional

**Files:**

- Modify: `src/shared/schemas/direction.ts:7-9`

- [ ] **Step 1: Verify current schema requires narration, visual, animation**

Run: `cd /Users/enriquevasallo/AAA/Coding/Proyectos-personales/remotion-playground && npx tsx -e "
const {BeatSchema} = require('./src/shared/schemas/direction');
const result = BeatSchema.safeParse({id: 'b1', startMs: 0});
console.log(JSON.stringify(result.error?.issues?.map(i => i.path + ': ' + i.message), null, 2));
"`

Expected: Errors for `narration`, `visual`, `animation` as "Required".

- [ ] **Step 2: Make the three fields optional in direction.ts**

Replace lines 7-9 in `src/shared/schemas/direction.ts`:

```typescript
  narration: z.string(),
  visual: z.string(),
  animation: z.string(),
```

With:

```typescript
  narration: z.string().nullable().optional(),
  visual: z.string().nullable().optional(),
  animation: z.string().nullable().optional(),
```

- [ ] **Step 3: Verify schema now accepts beats without those fields**

Run: `cd /Users/enriquevasallo/AAA/Coding/Proyectos-personales/remotion-playground && npx tsx -e "
const {BeatSchema} = require('./src/shared/schemas/direction');
const result = BeatSchema.safeParse({id: 'b1', startMs: 0});
console.log('valid:', result.success);
const full = BeatSchema.safeParse({id: 'b1', startMs: 0, narration: 'hi', visual: 'fade', animation: 'spring'});
console.log('full valid:', full.success);
"`

Expected: Both `valid: true` and `full valid: true`.

- [ ] **Step 4: Run TypeScript type check**

Run: `cd /Users/enriquevasallo/AAA/Coding/Proyectos-personales/remotion-playground && npx tsc --noEmit`

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/schemas/direction.ts
git commit -m "fix(schema): make BeatSchema narration/visual/animation optional

Director should provide these fields but missing values shouldn't block
renders. Validator can flag them as warnings instead."
```

---

### Task 7: Fix checkpoint feedback propagation in orchestrator prompt

**Files:**

- Modify: `packages/agent/prompts/orchestrator.md:53-56`

- [ ] **Step 1: Update the STOP CONDITIONS section**

Replace lines 53-56 in `packages/agent/prompts/orchestrator.md`:

```markdown
- Each agent should be dispatched EXACTLY ONCE per pipeline run.
- If check_render_status returns status="error", report the error to the user and STOP.
- If validator reports blocking errors, inform the user and STOP.
- If ANY subagent returns an error, inform the user and STOP. Do not retry or restart the pipeline.
```

With:

```markdown
- Each agent should be dispatched ONCE per pipeline run.
- EXCEPTION: If a checkpoint is REJECTED with feedback, re-dispatch that same agent with the user's feedback appended to the task description. Only re-dispatch the agent that owns the rejected checkpoint — never skip ahead.
- Forward relevant feedback to downstream agents when it affects their scope (e.g., if the user says "add audio" during CP2, mention it in the audio_planner's task description).
- If check_render_status returns status="error", report the error to the user and STOP.
- If validator reports blocking errors, inform the user and STOP.
- If ANY subagent returns an error, inform the user and STOP. Do not retry or restart the pipeline.
```

- [ ] **Step 2: Verify the prompt file is valid markdown**

Run: `head -70 packages/agent/prompts/orchestrator.md`

Expected: Well-formed markdown with the updated rules visible.

- [ ] **Step 3: Commit**

```bash
git add packages/agent/prompts/orchestrator.md
git commit -m "fix(agent): allow re-dispatch on checkpoint rejection

Orchestrator can now re-dispatch an agent when the user rejects a
checkpoint with feedback, instead of being stuck on 'dispatch once' rule."
```

---

### Task 8: Investigate LangGraph run termination with pending tool calls (Bugs 8-9)

**Files:**

- Modify: `packages/agent/graph_server.py` (add logging)
- Modify: `packages/agent/src/orchestrator.py` (add write_todos disable option)

- [ ] **Step 1: Add run-state logging to graph_server.py**

Replace the content of `packages/agent/graph_server.py` with:

```python
"""Entry point for langgraph dev server."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("video-agent")

_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_ROOT / ".env")

_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if _creds and not Path(_creds).is_absolute():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(_ROOT / _creds)

from src.agent import create_video_agent  # noqa: E402

graph = create_video_agent()

logger.info("Video agent graph loaded. Nodes: %s", list(graph.get_graph().nodes) if hasattr(graph, "get_graph") else "N/A")
```

- [ ] **Step 2: Add option to disable write_todos via env var**

Add after line 16 in `packages/agent/src/orchestrator.py` (after `DEFAULT_MODEL = ...`):

```python
DISABLE_WRITE_TODOS = os.environ.get("DISABLE_WRITE_TODOS", "").lower() in ("1", "true", "yes")
```

Then in `create_video_orchestrator()`, add after the `kwargs` dict (before the `if checkpointer` line):

```python
    if DISABLE_WRITE_TODOS:
        from deepagents.middleware.todo import TodoListMiddleware
        kwargs["excluded_middleware"] = [TodoListMiddleware]
```

Note: If `excluded_middleware` isn't supported (DeepAgents docs say it can't list SubAgentMiddleware), try this alternative approach instead — set `general_purpose_subagent` to disabled:

```python
    if DISABLE_WRITE_TODOS:
        kwargs.setdefault("middleware", [])
        # TodoListMiddleware is in the default stack; we can't exclude it
        # directly, but we can override the todo system_prompt to be empty
        from deepagents.middleware.todo import TodoListMiddleware
        kwargs["middleware"].append(TodoListMiddleware(system_prompt="Do NOT use write_todos. Plan using text responses only."))
```

- [ ] **Step 3: Test locally with `DISABLE_WRITE_TODOS=true`**

Run: `cd packages/agent && DISABLE_WRITE_TODOS=true python -c "from src.orchestrator import create_video_orchestrator; g = create_video_orchestrator(); print('OK')" `

Expected: `OK` — no crash on startup.

- [ ] **Step 4: Document the investigation findings**

Create a section at the bottom of the orchestrator prompt (`packages/agent/prompts/orchestrator.md`) after the Rules section:

```markdown
## Known runtime behavior

- When using `langgraph dev`, runs may terminate with `status: "success"` but `next: ["tools"]`. This means tool calls are pending. Resume by sending a new run with `input: null` to continue execution.
- The `write_todos` tool may fail when Gemini sends nested format `{"todos": {"items": [...]}}` instead of `{"todos": [...]}`. If write_todos fails, continue without it — the pipeline workflow is fixed and doesn't need dynamic TODO tracking.
- Set `DISABLE_WRITE_TODOS=true` to prevent write_todos from interfering with parallel tool calls.
```

- [ ] **Step 5: Commit**

```bash
git add packages/agent/graph_server.py packages/agent/src/orchestrator.py packages/agent/prompts/orchestrator.md
git commit -m "fix(agent): add logging and write_todos disable option for runtime bugs

Adds run-state logging to graph_server.py for debugging pending tool calls.
Adds DISABLE_WRITE_TODOS env var to prevent write_todos format errors from
blocking parallel task dispatches."
```

---

### Task 9: Update CHANGELOG and run final E2E verification

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update CHANGELOG**

Add under `[Unreleased]`:

```markdown
### Fixed

- Agent: `list_audio_library()` now finds MP3 files instead of directories — videos will have background music
- Agent: Voiceover generation no longer requires `enabled: true` — presence of scenes is sufficient
- Agent: Base64 audio handling cleaned up — bytes written directly, strings decoded properly, unexpected types raise error
- Agent: FFmpeg discovery fails fast with clear error instead of silent runtime failure; supports `FFMPEG_PATH` env var
- Agent: Default render dimensions changed from ProductShort (1080x1920) to Tutorial (1280x720)
- Schema: BeatSchema `narration`, `visual`, `animation` fields are now optional — missing fields no longer block renders
- Agent: Orchestrator allows re-dispatching agents on checkpoint rejection with user feedback
- Agent: Added run-state logging and `DISABLE_WRITE_TODOS` env var for LangGraph runtime debugging
```

- [ ] **Step 2: Run full test suite one final time**

Run: `cd packages/agent && python -m pytest tests/ -v`

Expected: All PASS.

- [ ] **Step 3: Run TypeScript checks**

Run: `npm run lint`

Expected: No errors.

- [ ] **Step 4: Commit CHANGELOG**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG with Phase 1 agent pipeline bug fixes"
```

- [ ] **Step 5: Tag completion**

All Phase 1 bugs (1-9) are now addressed. Phase 2 (idiomatic DeepAgents patterns) will be planned separately.
