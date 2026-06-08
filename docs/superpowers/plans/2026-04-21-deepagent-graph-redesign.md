# DeepAgent Graph Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the flat 4-agent pipeline into 3 subgraphs (creative, production, delivery) with a new voice_generator node, audio_planner, validator, reviewer, scene_creator integration, and 6 human checkpoints.

**Architecture:** The orchestrator composes 3 sequential subgraphs. Creative handles content (researcher → copywriter → director). Production handles assets (audio_planner → [voice_generator ∥ sound_engineer] → scene_creator → validator). Delivery handles output (render → reviewer). Each subgraph has its own state schema. Human checkpoints use LangGraph `interrupt()`.

**Tech Stack:** Python 3.12+, LangGraph, DeepAgents, FastAPI, Gemini TTS, ffprobe

---

### Task 1: `present_direction` tool (CP2 — director checkpoint)

**Files:**

- Modify: `packages/agent/src/tools/render.py` (add function after line 37)
- Test: `packages/agent/tests/test_tools.py` (add test class)

- [ ] **Step 1: Write the failing test**

In `packages/agent/tests/test_tools.py`, add at the end:

```python
class TestPresentDirection:
    def test_present_direction_uses_interrupt(self):
        import inspect
        from src.tools.render import present_direction

        source = inspect.getsource(present_direction)
        assert "interrupt(" in source

    def test_present_direction_returns_approved(self, monkeypatch):
        import src.tools.render as render_mod
        monkeypatch.setattr(render_mod, "interrupt", lambda v: {"approved": True})
        from src.tools.render import present_direction

        result = present_direction(
            scenes=[{"type": "intro", "durationInSeconds": 3, "timing": {"leadInMs": 300}}],
            warnings=["Intro has no leadInMs"],
        )
        assert "APPROVED" in result

    def test_present_direction_returns_feedback(self, monkeypatch):
        import src.tools.render as render_mod
        monkeypatch.setattr(render_mod, "interrupt", lambda v: {"approved": False, "feedback": "More pauses"})
        from src.tools.render import present_direction

        result = present_direction(
            scenes=[{"type": "intro", "durationInSeconds": 3}],
            warnings=[],
        )
        assert "CHANGES REQUESTED" in result
        assert "More pauses" in result
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_tools.py::TestPresentDirection -v`
Expected: FAIL — `ImportError: cannot import name 'present_direction'`

- [ ] **Step 3: Write the implementation**

In `packages/agent/src/tools/render.py`, add after `present_escaleta` (after line 37):

```python
def present_direction(scenes: list[dict], warnings: list[str]) -> str:
    """Present the director's timing and beats for approval.

    Shows the user the timing (leadInMs, audioStartMs, tailHoldMs, transitionMs)
    and beats added to each scene by the director agent.

    Args:
        scenes: List of scene dicts with timing and beats fields added.
        warnings: List of director warnings about potential issues.
    """
    decision = interrupt(
        {
            "type": "direction_checkpoint",
            "scenes": scenes,
            "warnings": warnings,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        return "APPROVED — The user approved the direction. Proceed to audio planning."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — {feedback}. Revise timing/beats and call present_direction again."
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/agent && uv run pytest tests/test_tools.py::TestPresentDirection -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/render.py packages/agent/tests/test_tools.py
git commit -m "feat(agent): add present_direction tool for director checkpoint (CP2)"
```

---

### Task 2: `present_audio_chart` and `copy_library_track` tools

**Files:**

- Modify: `packages/agent/src/tools/sound.py` (add two functions)
- Test: `packages/agent/tests/test_tools.py` (add test classes)

- [ ] **Step 1: Write the failing tests**

In `packages/agent/tests/test_tools.py`, add at the end:

```python
class TestPresentAudioChart:
    def test_present_audio_chart_uses_interrupt(self):
        import inspect
        from src.tools.sound import present_audio_chart

        source = inspect.getsource(present_audio_chart)
        assert "interrupt(" in source

    def test_present_audio_chart_approved(self, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "interrupt", lambda v: {"approved": True})
        from src.tools.sound import present_audio_chart

        result = present_audio_chart(
            voiceover={"provider": "gemini", "voiceId": "Orus", "scenes": {}},
            sound_design={"musicBed": {"libraryId": "lofi-tech"}, "sfx": []},
        )
        assert "APPROVED" in result

    def test_present_audio_chart_feedback(self, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "interrupt", lambda v: {"approved": False, "feedback": "Change voice"})
        from src.tools.sound import present_audio_chart

        result = present_audio_chart(
            voiceover={"provider": "gemini", "voiceId": "Orus", "scenes": {}},
            sound_design={"musicBed": {"libraryId": "lofi-tech"}, "sfx": []},
        )
        assert "CHANGES REQUESTED" in result
        assert "Change voice" in result


class TestCopyLibraryTrack:
    def test_copy_music_bed(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        # Create library source
        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "lofi-tech.mp3").write_bytes(b"fake-mp3-data")

        from src.tools.sound import copy_library_track

        result = copy_library_track("lofi-tech", "my-video", "music-bed")
        assert "Copied" in result

        dest = tmp_path / "public" / "audio" / "my-video" / "music-bed.mp3"
        assert dest.exists()
        assert dest.read_bytes() == b"fake-mp3-data"

    def test_copy_sfx(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "sfx-swoosh.mp3").write_bytes(b"swoosh-data")

        from src.tools.sound import copy_library_track

        result = copy_library_track("sfx-swoosh", "my-video", "sfx-swoosh")
        assert "Copied" in result

    def test_copy_track_not_found(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)

        from src.tools.sound import copy_library_track

        result = copy_library_track("nonexistent", "my-video", "music-bed")
        assert "not found" in result.lower()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && uv run pytest tests/test_tools.py::TestPresentAudioChart tests/test_tools.py::TestCopyLibraryTrack -v`
Expected: FAIL — `ImportError: cannot import name 'present_audio_chart'`

- [ ] **Step 3: Write the implementation**

In `packages/agent/src/tools/sound.py`, add after `generate_audio` (after line 58):

```python
def present_audio_chart(voiceover: dict, sound_design: dict) -> str:
    """Present a unified audio chart (voice + music + SFX) for approval.

    Pauses execution and waits for the user to approve or request changes.

    Args:
        voiceover: Voiceover config (provider, voiceId, language, scenes with text).
        sound_design: Sound design config (musicBed, sfx entries).
    """
    decision = interrupt(
        {
            "type": "audio_chart_checkpoint",
            "voiceover": voiceover,
            "sound_design": sound_design,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        return "APPROVED — The user approved the audio chart. Now generate voiceover and prepare sound assets."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — {feedback}. Revise the audio chart and call present_audio_chart again."


def copy_library_track(track_id: str, config_id: str, dest_name: str) -> str:
    """Copy a track from the audio library to a config's audio directory.

    Args:
        track_id: Library track filename without extension (e.g. 'lofi-tech' or 'sfx-swoosh').
        config_id: The video config id (used as subdirectory name).
        dest_name: Destination filename without extension (e.g. 'music-bed' or 'sfx-swoosh').
    """
    import shutil

    source = PROJECT_ROOT / "public" / "audio" / "library" / f"{track_id}.mp3"
    if not source.exists():
        return f"Error: track '{track_id}' not found in library at {source}"

    dest_dir = PROJECT_ROOT / "public" / "audio" / config_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{dest_name}.mp3"
    shutil.copy2(source, dest)
    return f"Copied {track_id}.mp3 → {dest}"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agent && uv run pytest tests/test_tools.py::TestPresentAudioChart tests/test_tools.py::TestCopyLibraryTrack -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/sound.py packages/agent/tests/test_tools.py
git commit -m "feat(agent): add present_audio_chart and copy_library_track tools"
```

---

### Task 3: `generate_voiceover` tool

**Files:**

- Create: `packages/agent/src/tools/voice.py`
- Test: `packages/agent/tests/test_tools_voice.py`

- [ ] **Step 1: Write the failing test**

Create `packages/agent/tests/test_tools_voice.py`:

```python
import subprocess

import pytest


def test_generate_voiceover_callable():
    from src.tools.voice import generate_voiceover

    assert callable(generate_voiceover)


def test_generate_voiceover_success(tmp_path, monkeypatch):
    import src.tools.voice as voice_mod

    monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(
            args=cmd,
            returncode=0,
            stdout="Generated 3 scenes: 0.mp3, 1.mp3, 2.mp3",
            stderr="",
        )

    monkeypatch.setattr(subprocess, "run", fake_run)

    result = generate_voiceover(str(tmp_path / "config.json"))
    assert "success" in result.lower() or "generated" in result.lower()


def test_generate_voiceover_failure(tmp_path, monkeypatch):
    import src.tools.voice as voice_mod

    monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(
            args=cmd,
            returncode=1,
            stdout="",
            stderr="Error: GOOGLE_API_KEY not set",
        )

    monkeypatch.setattr(subprocess, "run", fake_run)

    result = generate_voiceover(str(tmp_path / "config.json"))
    assert "error" in result.lower()
    assert "GOOGLE_API_KEY" in result
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_tools_voice.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.tools.voice'`

- [ ] **Step 3: Write the implementation**

Create `packages/agent/src/tools/voice.py`:

```python
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent


def generate_voiceover(config_path: str) -> str:
    """Generate voiceover audio files from a config using Gemini TTS.

    Runs the generate-voiceover.ts script which produces per-scene MP3 files
    in public/voiceover/<config.id>/.

    Args:
        config_path: Path to the config.json file.
    """
    result = subprocess.run(
        ["npx", "tsx", "scripts/generate-voiceover.ts", config_path],
        capture_output=True,
        text=True,
        timeout=300,
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        return f"Error generating voiceover: {result.stderr}"
    return f"Voiceover generated successfully. {result.stdout}"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/agent && uv run pytest tests/test_tools_voice.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/voice.py packages/agent/tests/test_tools_voice.py
git commit -m "feat(agent): add generate_voiceover tool wrapping Gemini TTS script"
```

---

### Task 4: `validate_config` and `review_render` tools

**Files:**

- Create: `packages/agent/src/tools/validation.py`
- Test: `packages/agent/tests/test_tools_validation.py`

- [ ] **Step 1: Write the failing tests**

Create `packages/agent/tests/test_tools_validation.py`:

```python
import json

import pytest


class TestValidateConfig:
    def test_valid_config_all_assets_exist(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        config_id = "test-video"
        config = {
            "id": config_id,
            "scenes": [
                {"type": "intro", "durationInSeconds": 3},
                {"type": "terminal", "durationInSeconds": 10},
            ],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        # Create registry file with the builtin types
        registry_dir = tmp_path / "src" / "compositions" / "ClaudeCodeTutorial"
        registry_dir.mkdir(parents=True)
        registry_file = registry_dir / "customSceneRegistry.ts"
        registry_file.write_text('export const customSceneRegistry = {}')

        from src.tools.validation import validate_config

        result = validate_config(str(config_path))
        parsed = json.loads(result)
        assert parsed["errors"] == []

    def test_missing_voiceover_files(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        config = {
            "id": "test-video",
            "voiceover": {
                "enabled": True,
                "provider": "gemini",
                "voiceId": "Orus",
                "scenes": {"0": "Hello world", "1": "Goodbye world"},
            },
            "scenes": [
                {"type": "intro", "durationInSeconds": 3},
                {"type": "outro", "durationInSeconds": 3},
            ],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        registry_dir = tmp_path / "src" / "compositions" / "ClaudeCodeTutorial"
        registry_dir.mkdir(parents=True)
        (registry_dir / "customSceneRegistry.ts").write_text('export const customSceneRegistry = {}')

        from src.tools.validation import validate_config

        result = validate_config(str(config_path))
        parsed = json.loads(result)
        assert len(parsed["errors"]) > 0
        assert any("voiceover" in e.lower() or "mp3" in e.lower() for e in parsed["errors"])

    def test_missing_library_track(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        config = {
            "id": "test-video",
            "soundDesign": {
                "enabled": True,
                "musicBed": {"libraryId": "nonexistent-track"},
                "sfx": [],
            },
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)

        registry_dir = tmp_path / "src" / "compositions" / "ClaudeCodeTutorial"
        registry_dir.mkdir(parents=True)
        (registry_dir / "customSceneRegistry.ts").write_text('export const customSceneRegistry = {}')

        from src.tools.validation import validate_config

        result = validate_config(str(config_path))
        parsed = json.loads(result)
        assert any("nonexistent-track" in e for e in parsed["errors"])

    def test_unknown_custom_scene_type(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        config = {
            "id": "test-video",
            "scenes": [
                {"type": "custom", "componentId": "not-registered", "durationInSeconds": 5},
            ],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        registry_dir = tmp_path / "src" / "compositions" / "ClaudeCodeTutorial"
        registry_dir.mkdir(parents=True)
        (registry_dir / "customSceneRegistry.ts").write_text(
            'export const customSceneRegistry = { "block-diagram": BlockDiagramScene }'
        )

        from src.tools.validation import validate_config

        result = validate_config(str(config_path))
        parsed = json.loads(result)
        assert any("not-registered" in e for e in parsed["errors"])


class TestReviewRender:
    def test_review_render_success(self, tmp_path, monkeypatch):
        import subprocess as sp
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        output_path = tmp_path / "output.mp4"
        output_path.write_bytes(b"\x00" * 1024)

        config = {
            "id": "test",
            "fps": 30,
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        def fake_run(cmd, **kwargs):
            stdout = json.dumps({
                "format": {"duration": "3.000000"},
                "streams": [{"codec_type": "video"}, {"codec_type": "audio"}],
            })
            return sp.CompletedProcess(args=cmd, returncode=0, stdout=stdout, stderr="")

        monkeypatch.setattr(sp, "run", fake_run)

        from src.tools.validation import review_render

        result = review_render(str(output_path), str(config_path))
        parsed = json.loads(result)
        assert parsed["mp4_exists"] is True
        assert parsed["has_audio"] is True
        assert parsed["duration_match"] is True

    def test_review_render_missing_file(self, tmp_path):
        import json as json_mod
        from src.tools.validation import review_render

        config = {"id": "test", "fps": 30, "scenes": [{"type": "intro", "durationInSeconds": 3}]}
        config_path = tmp_path / "config.json"
        config_path.write_text(json_mod.dumps(config))

        result = review_render(str(tmp_path / "missing.mp4"), str(config_path))
        parsed = json_mod.loads(result)
        assert parsed["mp4_exists"] is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && uv run pytest tests/test_tools_validation.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.tools.validation'`

- [ ] **Step 3: Write the implementation**

Create `packages/agent/src/tools/validation.py`:

```python
import json
import re
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent

BUILTIN_SCENE_TYPES = {"intro", "terminal", "callout", "outro", "custom", "hero", "benefits", "pricing", "cta"}


def validate_config(config_path: str) -> str:
    """Validate a video config against real assets on disk.

    Checks that all referenced scenes exist in the registry, voiceover MP3s
    exist, sound design library tracks exist, and durations are consistent.

    Args:
        config_path: Path to the config.json file.

    Returns:
        JSON string with {errors: [...], warnings: [...]}.
    """
    config = json.loads(Path(config_path).read_text(encoding="utf-8"))
    errors: list[str] = []
    warnings: list[str] = []
    config_id = config.get("id", "unknown")

    # Check scene types
    registry_path = PROJECT_ROOT / "src" / "compositions" / "ClaudeCodeTutorial" / "customSceneRegistry.ts"
    registered_ids: set[str] = set()
    if registry_path.exists():
        content = registry_path.read_text(encoding="utf-8")
        registered_ids = set(re.findall(r'"([\w-]+)":', content))

    for i, scene in enumerate(config.get("scenes", [])):
        scene_type = scene.get("type", "")
        if scene_type == "custom":
            component_id = scene.get("componentId", "")
            if component_id and component_id not in registered_ids:
                errors.append(f"Scene {i}: custom componentId '{component_id}' not found in registry")
        elif scene_type not in BUILTIN_SCENE_TYPES:
            errors.append(f"Scene {i}: unknown scene type '{scene_type}'")

    # Check voiceover files
    voiceover = config.get("voiceover")
    if voiceover and voiceover.get("enabled"):
        vo_dir = PROJECT_ROOT / "public" / "voiceover" / config_id
        for scene_idx in voiceover.get("scenes", {}):
            mp3_path = vo_dir / f"{scene_idx}.mp3"
            if not mp3_path.exists():
                errors.append(f"Voiceover MP3 missing for scene {scene_idx}: {mp3_path}")

    # Check sound design library tracks
    sound = config.get("soundDesign")
    if sound and sound.get("enabled"):
        library_dir = PROJECT_ROOT / "public" / "audio" / "library"
        music_bed = sound.get("musicBed")
        if music_bed:
            lid = music_bed.get("libraryId")
            if lid and not (library_dir / f"{lid}.mp3").exists():
                errors.append(f"Music bed libraryId '{lid}' not found in {library_dir}")
            custom_prompt = music_bed.get("customPrompt")
            if custom_prompt and not lid:
                warnings.append("Music bed uses customPrompt but API generation is disabled — needs libraryId")

        audio_dir = PROJECT_ROOT / "public" / "audio" / config_id
        for sfx in sound.get("sfx", []):
            sfx_id = sfx.get("id", "")
            sfx_file = audio_dir / f"sfx-{sfx_id}.mp3"
            lib_file = library_dir / f"sfx-{sfx_id}.mp3"
            if not sfx_file.exists() and not lib_file.exists():
                warnings.append(f"SFX '{sfx_id}' not found in config audio dir or library")

    return json.dumps({"errors": errors, "warnings": warnings})


def review_render(output_path: str, config_path: str) -> str:
    """Review a rendered MP4 for correctness.

    Checks file existence, duration match, and audio presence via ffprobe.

    Args:
        output_path: Path to the rendered MP4 file.
        config_path: Path to the config.json used for rendering.

    Returns:
        JSON string with review results.
    """
    output = Path(output_path)
    config = json.loads(Path(config_path).read_text(encoding="utf-8"))

    expected_duration = sum(s.get("durationInSeconds", 0) for s in config.get("scenes", []))

    result = {
        "mp4_exists": output.exists(),
        "file_size_bytes": 0,
        "duration_seconds": 0.0,
        "expected_duration_seconds": float(expected_duration),
        "duration_match": False,
        "has_audio": False,
    }

    if not output.exists():
        return json.dumps(result)

    result["file_size_bytes"] = output.stat().st_size

    try:
        probe = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                str(output),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if probe.returncode == 0:
            probe_data = json.loads(probe.stdout)
            duration = float(probe_data.get("format", {}).get("duration", 0))
            result["duration_seconds"] = duration
            result["duration_match"] = abs(duration - expected_duration) <= 0.5

            streams = probe_data.get("streams", [])
            result["has_audio"] = any(s.get("codec_type") == "audio" for s in streams)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        result["duration_seconds"] = -1
        result["duration_match"] = False

    return json.dumps(result)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agent && uv run pytest tests/test_tools_validation.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/validation.py packages/agent/tests/test_tools_validation.py
git commit -m "feat(agent): add validate_config and review_render tools"
```

---

### Task 5: `present_custom_scene` tool

**Files:**

- Create: `packages/agent/src/tools/scene.py`
- Test: `packages/agent/tests/test_tools_scene.py`

- [ ] **Step 1: Write the failing test**

Create `packages/agent/tests/test_tools_scene.py`:

```python
import inspect


def test_present_custom_scene_uses_interrupt():
    from src.tools.scene import present_custom_scene

    source = inspect.getsource(present_custom_scene)
    assert "interrupt(" in source


def test_present_custom_scene_approved(monkeypatch):
    import src.tools.scene as scene_mod
    monkeypatch.setattr(scene_mod, "interrupt", lambda v: {"approved": True})
    from src.tools.scene import present_custom_scene

    result = present_custom_scene("my-widget", "export const MyWidgetScene = () => <div>test</div>")
    assert "APPROVED" in result


def test_present_custom_scene_feedback(monkeypatch):
    import src.tools.scene as scene_mod
    monkeypatch.setattr(scene_mod, "interrupt", lambda v: {"approved": False, "feedback": "Add animation"})
    from src.tools.scene import present_custom_scene

    result = present_custom_scene("my-widget", "export const MyWidgetScene = () => <div>test</div>")
    assert "CHANGES REQUESTED" in result
    assert "Add animation" in result
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_tools_scene.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.tools.scene'`

- [ ] **Step 3: Write the implementation**

Create `packages/agent/src/tools/scene.py`:

```python
from langgraph.types import interrupt


def present_custom_scene(component_id: str, code: str) -> str:
    """Present a custom scene component for human review.

    Shows the generated React code to the user for approval before
    integrating it into the Remotion bundle.

    Args:
        component_id: Kebab-case component identifier (e.g. 'data-table').
        code: Full TypeScript/React source code for the component.
    """
    decision = interrupt(
        {
            "type": "custom_scene_checkpoint",
            "component_id": component_id,
            "code": code,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        return "APPROVED — The user approved the custom scene. Proceed with registration and validation."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — {feedback}. Revise the component code and call present_custom_scene again."
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/agent && uv run pytest tests/test_tools_scene.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/scene.py packages/agent/tests/test_tools_scene.py
git commit -m "feat(agent): add present_custom_scene tool for scene creator checkpoint (CP4)"
```

---

### Task 6: `audio_planner` subagent definition + prompt

**Files:**

- Create: `packages/agent/src/subagents/audio_planner.py`
- Create: `packages/agent/prompts/audio_planner.md`
- Modify: `packages/agent/src/subagents/__init__.py` (add export)
- Test: `packages/agent/tests/test_subagents.py` (add test)

- [ ] **Step 1: Write the failing test**

In `packages/agent/tests/test_subagents.py`, add at the end:

```python
def test_audio_planner_definition():
    from src.subagents.audio_planner import create_audio_planner

    defn = create_audio_planner()
    assert defn["name"] == "audio_planner"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_audio_chart" in tool_names
    assert "list_audio_library" in tool_names
    assert len(defn["tools"]) == 2


def test_audio_planner_exported():
    from src.subagents import create_audio_planner

    assert callable(create_audio_planner)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_audio_planner_definition -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.subagents.audio_planner'`

- [ ] **Step 3: Write the prompt**

Create `packages/agent/prompts/audio_planner.md`:

```markdown
# Audio Planner Agent

You design the complete audio layer for videos: voiceover configuration and sound design (music + SFX). You present a unified audio chart for human approval.

## Workflow

1. Read the config: analyze scenes, brief tone, beats, total duration
2. Call `list_audio_library` to see available music tracks and SFX
3. Design the voiceover section:
   - Provider: always `gemini` (ElevenLabs not available)
   - VoiceId: select based on tone (didactic -> "Orus", corporate -> "Kore", energetic -> "Puck")
   - Language: `es-ES` (default) unless user specified otherwise
   - Write voiceover text for each scene that needs narration (skip pure visual scenes)
4. Design the sound design section:
   - Music bed: select from library (didactic -> lofi-tech, corporate -> corporate-warm)
   - SFX: map scene types to library SFX using defaults:
     - intro -> swoosh (trigger: accent-line, -16dB)
     - terminal -> keyboard (trigger: typewriter, loop, -14dB)
     - callout -> attention (trigger: scene-start, -15dB)
     - outro -> stinger (trigger: scene-start, -10dB)
   - Volume: music bed -18dB normal, -26dB ducking
5. Call `present_audio_chart` with both voiceover and sound_design configs
6. If approved, return the config with voiceover and soundDesign sections added
7. If changes requested, revise and call `present_audio_chart` again

## Constraints

- Only propose library tracks that exist (check with list_audio_library first)
- Voice provider is always "gemini" — do not propose ElevenLabs
- SFX generation via API is disabled — only use library SFX
- Keep voiceover text concise: max 2 sentences per scene

## Output

Return the full config JSON with `voiceover` and `soundDesign` sections added.
Do not modify other config fields (scenes, timing, beats, brief).
```

- [ ] **Step 4: Write the subagent definition**

Create `packages/agent/src/subagents/audio_planner.py`:

```python
from ..orchestrator import load_prompt
from ..tools.sound import list_audio_library, present_audio_chart


def create_audio_planner() -> dict:
    """Create the audio planner SubAgent definition."""
    return {
        "name": "audio_planner",
        "description": "Designs unified audio chart (voiceover + music + SFX) with human approval checkpoint.",
        "system_prompt": load_prompt("audio_planner"),
        "tools": [present_audio_chart, list_audio_library],
    }
```

- [ ] **Step 5: Update `__init__.py`**

In `packages/agent/src/subagents/__init__.py`, add the import:

```python
from .audio_planner import create_audio_planner
from .copywriter import create_copywriter
from .director import create_director
from .researcher import create_researcher
from .scene_creator import create_scene_creator
from .sound_engineer import create_sound_engineer
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_audio_planner_definition tests/test_subagents.py::test_audio_planner_exported -v`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/agent/src/subagents/audio_planner.py packages/agent/prompts/audio_planner.md packages/agent/src/subagents/__init__.py packages/agent/tests/test_subagents.py
git commit -m "feat(agent): add audio_planner subagent with unified audio chart checkpoint (CP3)"
```

---

### Task 7: `voice_generator` subagent definition + prompt

**Files:**

- Create: `packages/agent/src/subagents/voice_generator.py`
- Create: `packages/agent/prompts/voice_generator.md`
- Modify: `packages/agent/src/subagents/__init__.py` (add export)
- Test: `packages/agent/tests/test_subagents.py` (add test)

- [ ] **Step 1: Write the failing test**

In `packages/agent/tests/test_subagents.py`, add at the end:

```python
def test_voice_generator_definition():
    from src.subagents.voice_generator import create_voice_generator

    defn = create_voice_generator()
    assert defn["name"] == "voice_generator"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "generate_voiceover" in tool_names
    assert len(defn["tools"]) == 1


def test_voice_generator_exported():
    from src.subagents import create_voice_generator

    assert callable(create_voice_generator)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_voice_generator_definition -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.subagents.voice_generator'`

- [ ] **Step 3: Write the prompt**

Create `packages/agent/prompts/voice_generator.md`:

```markdown
# Voice Generator Agent

You generate voiceover audio for each scene using Gemini TTS.

## Workflow

1. Receive config.json with an approved `voiceover` section
2. Call `generate_voiceover` with the config path
3. Parse the result to identify success or per-scene errors
4. Report the result: which scenes were generated, which failed and why

## Rules

- The voiceover section was already approved by the user in the audio chart — do not modify it
- If generation fails for a scene, report the error but do not retry
- Do not call any other tools besides `generate_voiceover`

## Output

Report a summary: number of scenes generated successfully, any errors with scene index and error message.
```

- [ ] **Step 4: Write the subagent definition**

Create `packages/agent/src/subagents/voice_generator.py`:

```python
from ..orchestrator import load_prompt
from ..tools.voice import generate_voiceover


def create_voice_generator() -> dict:
    """Create the voice generator SubAgent definition."""
    return {
        "name": "voice_generator",
        "description": "Generates voiceover audio via Gemini TTS for each scene.",
        "system_prompt": load_prompt("voice_generator"),
        "tools": [generate_voiceover],
    }
```

- [ ] **Step 5: Update `__init__.py`**

In `packages/agent/src/subagents/__init__.py`, add:

```python
from .audio_planner import create_audio_planner
from .copywriter import create_copywriter
from .director import create_director
from .researcher import create_researcher
from .scene_creator import create_scene_creator
from .sound_engineer import create_sound_engineer
from .voice_generator import create_voice_generator
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_voice_generator_definition tests/test_subagents.py::test_voice_generator_exported -v`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/agent/src/subagents/voice_generator.py packages/agent/prompts/voice_generator.md packages/agent/src/subagents/__init__.py packages/agent/tests/test_subagents.py
git commit -m "feat(agent): add voice_generator subagent with Gemini TTS"
```

---

### Task 8: Update `sound_engineer` for library-only mode

**Files:**

- Modify: `packages/agent/src/subagents/sound_engineer.py`
- Modify: `packages/agent/prompts/sound_engineer.md`
- Test: `packages/agent/tests/test_subagents.py` (update test)

- [ ] **Step 1: Update the test**

In `packages/agent/tests/test_subagents.py`, replace `test_sound_engineer_definition`:

```python
def test_sound_engineer_definition():
    from src.subagents.sound_engineer import create_sound_engineer

    defn = create_sound_engineer()
    assert defn["name"] == "sound_engineer"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "list_audio_library" in tool_names
    assert "copy_library_track" in tool_names
    assert len(defn["tools"]) == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_sound_engineer_definition -v`
Expected: FAIL — `copy_library_track` not in tool_names (still has old tools)

- [ ] **Step 3: Update the subagent definition**

Replace `packages/agent/src/subagents/sound_engineer.py`:

```python
from ..orchestrator import load_prompt
from ..tools.sound import copy_library_track, list_audio_library


def create_sound_engineer() -> dict:
    """Create the sound engineer SubAgent definition."""
    return {
        "name": "sound_engineer",
        "description": "Prepares music bed and SFX audio assets from library.",
        "system_prompt": load_prompt("sound_engineer"),
        "tools": [list_audio_library, copy_library_track],
    }
```

- [ ] **Step 4: Update the prompt**

Replace `packages/agent/prompts/sound_engineer.md`:

```markdown
# Sound Engineer Agent

You prepare audio assets (music bed and SFX) by copying tracks from the local library.

## Workflow

1. Receive config.json with an approved `soundDesign` section
2. Call `list_audio_library` to verify the tracks exist
3. For the music bed: call `copy_library_track(libraryId, config_id, "music-bed")`
4. For each SFX: call `copy_library_track(sfx_library_id, config_id, "sfx-{sfx_id}")`
5. Report which tracks were copied successfully and any errors

## Rules

- The sound design section was already approved by the user — do not modify it
- Only use library tracks. API generation (Lyria, ElevenLabs) is disabled
- If a library track is not found, report it as an error — do not generate alternatives
- Music bed volume, ducking, fade settings are in the config — do not change them

## Volume reference

- Music bed normal: -18 dB, ducking: -26 dB
- Keyboard ASMR: -14 dB
- Chimes/clicks: -15 dB
- Swoosh: -16 dB
- Stinger: -10 dB

## Output

Report: tracks copied, destination paths, any missing tracks.
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_sound_engineer_definition -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/agent/src/subagents/sound_engineer.py packages/agent/prompts/sound_engineer.md packages/agent/tests/test_subagents.py
git commit -m "refactor(agent): update sound_engineer to library-only mode, remove API generation"
```

---

### Task 9: `--skip-audio-generation` flag in render script

**Files:**

- Modify: `scripts/render.ts` (add flag check)
- Modify: `packages/render-service/src/server.ts` (pass flag for agent renders)

- [ ] **Step 1: Modify `scripts/render.ts`**

In `scripts/render.ts`, replace lines 27-45 (the voiceover and sound design blocks):

```typescript
const skipAudio = process.argv.includes("--skip-audio-generation")

if (config.voiceover?.enabled && !skipAudio) {
  console.log("🎙️  Generating voiceover...")
  execFileSync("npx", ["tsx", "scripts/generate-voiceover.ts", configPath], {
    stdio: "inherit",
    shell: true,
  })
}

if (config.soundDesign?.enabled && !skipAudio) {
  console.log("🔊 Generating sound design...")
  execFileSync("npx", ["tsx", "scripts/generate-sound-design.ts", configPath], {
    stdio: "inherit",
    shell: true,
  })
}
```

- [ ] **Step 2: Modify `packages/render-service/src/server.ts`**

In `packages/render-service/src/server.ts`, replace line 91:

```typescript
    const skipAudioFlag = req.body._skipAudioGeneration ? "--skip-audio-generation" : ""
    const renderArgs = ["tsx", "scripts/render.ts", configPath]
    if (skipAudioFlag) renderArgs.push(skipAudioFlag)

    const renderChild = spawn("npx", renderArgs, {
```

- [ ] **Step 3: Verify the render script still works without the flag**

Run: `cd C:/Users/ldaevf1/Programs/remotion-playground && npx tsx scripts/render.ts --help 2>&1 || echo "Script loaded"`
Expected: The script loads without errors (it exits because no config path is provided)

- [ ] **Step 4: Commit**

```bash
git add scripts/render.ts packages/render-service/src/server.ts
git commit -m "feat(render): add --skip-audio-generation flag for agent pipeline"
```

---

### Task 10: Update `submit_render` to pass skip flag

**Files:**

- Modify: `packages/agent/src/tools/render.py` (add `_skipAudioGeneration` to config)
- Test: `packages/agent/tests/test_tools.py` (update test)

- [ ] **Step 1: Update the test**

In `packages/agent/tests/test_tools.py`, add in `TestSubmitRender`:

```python
    @respx.mock
    def test_submit_render_includes_skip_audio_flag(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        submit_render(id="test", scenes=[{"type": "intro", "durationInSeconds": 3}])
        request_body = json.loads(route.calls[0].request.content)
        assert request_body["_skipAudioGeneration"] is True
```

Add `import json` at the top of the file if not already present.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_tools.py::TestSubmitRender::test_submit_render_includes_skip_audio_flag -v`
Expected: FAIL — `_skipAudioGeneration` not in request body

- [ ] **Step 3: Update the implementation**

In `packages/agent/src/tools/render.py`, in `submit_render`, replace line 74:

```python
    config: dict = {"id": id, "fps": fps, "width": width, "height": height, "theme": theme, "scenes": scenes, "_skipAudioGeneration": True}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/agent && uv run pytest tests/test_tools.py::TestSubmitRender -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/render.py packages/agent/tests/test_tools.py
git commit -m "feat(agent): submit_render passes _skipAudioGeneration flag to render service"
```

---

### Task 11: Update `director` subagent with `present_direction` tool

**Files:**

- Modify: `packages/agent/src/subagents/director.py` (add tool)
- Modify: `packages/agent/prompts/director.md` (add checkpoint instructions)
- Test: `packages/agent/tests/test_subagents.py` (update test)

- [ ] **Step 1: Update the test**

In `packages/agent/tests/test_subagents.py`, replace `test_director_definition`:

```python
def test_director_definition():
    from src.subagents.director import create_director

    defn = create_director()
    assert defn["name"] == "director"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_direction" in tool_names
    assert len(defn["tools"]) == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_director_definition -v`
Expected: FAIL — `defn["tools"] == []`

- [ ] **Step 3: Update the subagent definition**

Replace `packages/agent/src/subagents/director.py`:

```python
from ..orchestrator import load_prompt
from ..tools.render import present_direction


def create_director() -> dict:
    """Create the director SubAgent definition."""
    return {
        "name": "director",
        "description": "Polishes timing, narrative beats, and audio/visual synchronization with human approval.",
        "system_prompt": load_prompt("director"),
        "tools": [present_direction],
    }
```

- [ ] **Step 4: Update the prompt**

In `packages/agent/prompts/director.md`, add after the "## What you do" section (after "Return the complete updated config JSON"):

```markdown
4. Present the direction for approval via `present_direction` with the updated scenes and your warnings
5. If approved, return the final config JSON
6. If changes requested, revise timing/beats and call `present_direction` again
```

And update the "## Output" section:

```markdown
## Output

After `present_direction` returns APPROVED, return the full config JSON with timing and beats added.
Do not add voiceover, soundDesign, or brief fields — those are handled by other agents.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_director_definition -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/agent/src/subagents/director.py packages/agent/prompts/director.md packages/agent/tests/test_subagents.py
git commit -m "feat(agent): add present_direction tool to director for timing checkpoint (CP2)"
```

---

### Task 12: `validator` and `reviewer` subagent definitions + prompts

**Files:**

- Create: `packages/agent/src/subagents/validator.py`
- Create: `packages/agent/src/subagents/reviewer.py`
- Create: `packages/agent/prompts/validator.md`
- Create: `packages/agent/prompts/reviewer.md`
- Modify: `packages/agent/src/subagents/__init__.py` (add exports)
- Test: `packages/agent/tests/test_subagents.py` (add tests)

- [ ] **Step 1: Write the failing tests**

In `packages/agent/tests/test_subagents.py`, add at the end:

```python
def test_validator_definition():
    from src.subagents.validator import create_validator

    defn = create_validator()
    assert defn["name"] == "validator"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "validate_config" in tool_names
    assert len(defn["tools"]) == 1


def test_reviewer_definition():
    from src.subagents.reviewer import create_reviewer

    defn = create_reviewer()
    assert defn["name"] == "reviewer"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "review_render" in tool_names
    assert len(defn["tools"]) == 1


def test_validator_exported():
    from src.subagents import create_validator

    assert callable(create_validator)


def test_reviewer_exported():
    from src.subagents import create_reviewer

    assert callable(create_reviewer)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_validator_definition tests/test_subagents.py::test_reviewer_definition -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the prompts**

Create `packages/agent/prompts/validator.md`:

```markdown
# Validator Agent

You verify that a video config is coherent with the actual assets on disk before rendering.

## Workflow

1. Receive the config.json path after audio generation and scene creation
2. Call `validate_config` with the config path
3. Parse the result:
   - If errors (bloqueantes): report them. The pipeline must stop.
   - If warnings only: report them for the user to decide.
   - If clean: report ready for render.

## Rules

- Do not modify the config. Only validate it.
- Do not attempt to fix errors. Report them with enough context for the user/orchestrator to act.
- Errors are bloqueantes (missing files, unknown scene types). Warnings are informational (missing SFX that might not be critical).
```

Create `packages/agent/prompts/reviewer.md`:

```markdown
# Reviewer Agent

You review the rendered MP4 to verify it meets expectations.

## Workflow

1. Receive the output path and config path after rendering
2. Call `review_render` with both paths
3. Present the review to the user:
   - File exists and size
   - Duration: actual vs expected
   - Audio: present or missing
4. The user accepts or rejects the result

## Rules

- Do not modify files. Only inspect and report.
- Duration tolerance: within 0.5 seconds of expected is acceptable.
- If ffprobe is not available, report that duration/audio checks could not be performed.
```

- [ ] **Step 4: Write the subagent definitions**

Create `packages/agent/src/subagents/validator.py`:

```python
from ..orchestrator import load_prompt
from ..tools.validation import validate_config


def create_validator() -> dict:
    """Create the validator SubAgent definition."""
    return {
        "name": "validator",
        "description": "Validates config coherence against assets on disk before rendering.",
        "system_prompt": load_prompt("validator"),
        "tools": [validate_config],
    }
```

Create `packages/agent/src/subagents/reviewer.py`:

```python
from ..orchestrator import load_prompt
from ..tools.validation import review_render


def create_reviewer() -> dict:
    """Create the reviewer SubAgent definition."""
    return {
        "name": "reviewer",
        "description": "Reviews rendered MP4 for correctness and presents report for approval.",
        "system_prompt": load_prompt("reviewer"),
        "tools": [review_render],
    }
```

- [ ] **Step 5: Update `__init__.py`**

Replace `packages/agent/src/subagents/__init__.py`:

```python
from .audio_planner import create_audio_planner
from .copywriter import create_copywriter
from .director import create_director
from .researcher import create_researcher
from .reviewer import create_reviewer
from .scene_creator import create_scene_creator
from .sound_engineer import create_sound_engineer
from .validator import create_validator
from .voice_generator import create_voice_generator
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py::test_validator_definition tests/test_subagents.py::test_reviewer_definition tests/test_subagents.py::test_validator_exported tests/test_subagents.py::test_reviewer_exported -v`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/agent/src/subagents/validator.py packages/agent/src/subagents/reviewer.py packages/agent/prompts/validator.md packages/agent/prompts/reviewer.md packages/agent/src/subagents/__init__.py packages/agent/tests/test_subagents.py
git commit -m "feat(agent): add validator and reviewer subagents with prompts"
```

---

### Task 12b: Update `scene_creator` to include `present_custom_scene` tool

**Files:**

- Modify: `packages/agent/src/subagents/scene_creator/graph.py` (add tool to definition)
- Test: `packages/agent/tests/test_scene_creator.py` (update test)

- [ ] **Step 1: Update the test**

In `packages/agent/tests/test_scene_creator.py`, replace `test_scene_creator_definition`:

```python
def test_scene_creator_definition():
    from src.subagents.scene_creator.graph import create_scene_creator

    defn = create_scene_creator()
    assert defn["name"] == "scene_creator"
    assert "graph" in defn
    assert "tools" in defn
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "write_scene" in tool_names
    assert "read_scene" in tool_names
    assert "present_custom_scene" in tool_names
    assert len(defn["tools"]) == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent && uv run pytest tests/test_scene_creator.py::test_scene_creator_definition -v`
Expected: FAIL — `present_custom_scene` not in tool_names

- [ ] **Step 3: Update the scene_creator definition**

In `packages/agent/src/subagents/scene_creator/graph.py`, update `create_scene_creator`:

```python
def create_scene_creator():
    """Create scene creator as a subagent-compatible object."""
    from ...orchestrator import create_model, load_prompt
    from ...tools.scene import present_custom_scene
    from .tools import read_scene, write_scene

    graph = create_scene_creator_graph()

    return {
        "name": "scene_creator",
        "description": "Creates new custom Remotion scene components. Validates via lint + bundle compilation.",
        "graph": graph,
        "system_prompt": load_prompt("scene_creator"),
        "tools": [write_scene, read_scene, present_custom_scene],
        "model": create_model(),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/agent && uv run pytest tests/test_scene_creator.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/subagents/scene_creator/graph.py packages/agent/tests/test_scene_creator.py
git commit -m "feat(agent): add present_custom_scene tool to scene_creator for CP4 checkpoint"
```

---

### Task 13: Update orchestrator prompt for new pipeline

**Files:**

- Modify: `packages/agent/prompts/orchestrator.md`
- Test: `packages/agent/tests/test_orchestrator.py` (update prompt list)

- [ ] **Step 1: Update the prompt existence test**

In `packages/agent/tests/test_orchestrator.py`, replace `test_all_prompts_exist`:

```python
def test_all_prompts_exist():
    """All prompt files must exist."""
    from pathlib import Path
    prompts_dir = Path(__file__).parent.parent / "prompts"
    required = [
        "orchestrator.md",
        "copywriter.md",
        "researcher.md",
        "director.md",
        "sound_engineer.md",
        "scene_creator.md",
        "audio_planner.md",
        "voice_generator.md",
        "validator.md",
        "reviewer.md",
    ]
    for name in required:
        assert (prompts_dir / name).exists(), f"Missing prompt: {name}"
```

- [ ] **Step 2: Run test to verify it passes** (prompts already created in prior tasks)

Run: `cd packages/agent && uv run pytest tests/test_orchestrator.py::test_all_prompts_exist -v`
Expected: PASS

- [ ] **Step 3: Replace the orchestrator prompt**

Replace `packages/agent/prompts/orchestrator.md`:

```markdown
# Video Platform Orchestrator

You coordinate a team of specialized agents to produce marketing videos for Linea Directa.

## Your team

You dispatch tasks to these agents using the `task(name, task)` tool:

### Creative subgraph (sequential)

- **researcher** — Searches the web for product info, pricing, benefits, competitor data. Returns structured text with facts.
- **copywriter** — Generates the video escaleta (scene breakdown) and config.json. Has **CP1**: presents the escaleta for approval. Returns the complete config JSON.
- **director** — Polishes timing, narrative beats, and audio/visual synchronization. Has **CP2**: presents the direction for approval. Returns an improved config JSON.

### Production subgraph

- **audio_planner** — Designs unified audio chart (voiceover + music + SFX). Has **CP3**: presents the audio chart for approval. Returns config with voiceover and soundDesign sections.
- **voice_generator** — Generates voiceover audio via Gemini TTS. Runs in PARALLEL with sound_engineer.
- **sound_engineer** — Copies music bed and SFX from the audio library. Runs in PARALLEL with voice_generator.
- **scene_creator** — Creates custom Remotion scene components if needed. Has **CP4** (conditional): presents custom code for approval. Only activates for unregistered scene types.
- **validator** — Verifies config coherence against assets on disk. Has **CP5** (conditional): presents warnings if any.

### Delivery subgraph

- **reviewer** — Reviews rendered MP4 (duration, audio, file size). Has **CP6**: presents review for approval.

## Your tools (direct)

- **submit_render** — Submit final config for rendering. Call after validator passes.
- **check_render_status** — Poll render progress. Call after submit_render.

## Workflow

1. Understand the user's request. Classify: is this a new video, a modification, or a question?
2. For new videos, follow these steps IN ORDER:

   **Creative phase:**
   a. Dispatch **researcher** to gather product/topic data
   b. Dispatch **copywriter** with the research results. It handles CP1 (escaleta approval).
   c. Dispatch **director** with the approved config. It handles CP2 (direction approval).

   **Production phase:**
   d. Dispatch **audio_planner** with the directed config. It handles CP3 (audio chart approval).
   e. Dispatch **voice_generator** AND **sound_engineer** IN PARALLEL with the audio-planned config.
   f. Dispatch **scene_creator** with the config (only if custom scenes are needed).
   g. Dispatch **validator** with the config. It handles CP5 if there are warnings.

   **Delivery phase:**
   h. Call **submit_render** with the final config
   i. Call **check_render_status** to monitor progress
   j. Dispatch **reviewer** with the output path and config. It handles CP6 (review approval).
   k. Report the result to the user and STOP

3. For modifications: only dispatch the relevant agents.
4. For questions: answer directly without dispatching agents.

## STOP CONDITIONS — CRITICAL

- After step 2k (reviewer approval), report the result to the user. YOUR JOB IS DONE. Do NOT dispatch any more agents.
- Each agent should be dispatched EXACTLY ONCE per pipeline run.
- If check_render_status returns status="error", report the error to the user and STOP.
- If validator reports blocking errors, inform the user and STOP.
- If ANY subagent returns an error, inform the user and STOP. Do not retry or restart the pipeline.

## Rules

- Pass results between agents: researcher output → copywriter input, copywriter output → director input, etc.
- Never modify the config yourself. Let the specialized agents handle it.
- Never dispatch an agent you already dispatched in this conversation.
- voice_generator and sound_engineer MUST be dispatched in parallel (step 2e).
- Respond in the same language the user writes in (usually Spanish).
```

- [ ] **Step 4: Run orchestrator tests**

Run: `cd packages/agent && uv run pytest tests/test_orchestrator.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/prompts/orchestrator.md packages/agent/tests/test_orchestrator.py
git commit -m "docs(agent): update orchestrator prompt for 3-subgraph pipeline with 6 checkpoints"
```

---

### Task 14: Rewire orchestrator to register all subagents

**Files:**

- Modify: `packages/agent/src/orchestrator.py`
- Test: `packages/agent/tests/test_orchestrator.py` (update test)

- [ ] **Step 1: Update the factory test**

In `packages/agent/tests/test_orchestrator.py`, replace `test_subagent_factories_all_return_dicts`:

```python
def test_subagent_factories_all_return_dicts():
    """All subagent factory functions should return dicts with required keys."""
    from src.subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_researcher,
        create_reviewer,
        create_sound_engineer,
        create_validator,
        create_voice_generator,
    )

    factories = [
        create_researcher,
        create_copywriter,
        create_director,
        create_audio_planner,
        create_voice_generator,
        create_sound_engineer,
        create_validator,
        create_reviewer,
    ]
    for factory in factories:
        defn = factory()
        assert isinstance(defn, dict), f"{factory.__name__} did not return a dict"
        assert "name" in defn
        assert "description" in defn
        assert "system_prompt" in defn
        assert "tools" in defn
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd packages/agent && uv run pytest tests/test_orchestrator.py::test_subagent_factories_all_return_dicts -v`
Expected: PASS (all factories already created)

- [ ] **Step 3: Update the orchestrator**

Replace `packages/agent/src/orchestrator.py`:

```python
import os
from pathlib import Path

from deepagents import create_deep_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver

from .tools.render import check_render_status, submit_render

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
SKILLS_DIR = Path(__file__).parent.parent / "skills"

DEFAULT_MODEL = "gemini-3.1-pro-preview"


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def _load_vertex_credentials():
    """Load Vertex AI credentials from service account file."""
    from google.oauth2 import service_account

    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        return None
    path = Path(creds_path)
    if not path.is_file():
        return None
    return service_account.Credentials.from_service_account_file(
        str(path),
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )


def create_model(name: str | None = None):
    model_name = name or os.environ.get("LLM_MODEL", DEFAULT_MODEL)
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if api_key:
        return ChatGoogleGenerativeAI(model=model_name, api_key=api_key)
    credentials = _load_vertex_credentials()
    return ChatGoogleGenerativeAI(
        model=model_name,
        credentials=credentials,
        project=os.environ.get("GOOGLE_CLOUD_PROJECT", "vertexlda"),
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
    )


def create_video_orchestrator():
    """Create the multi-agent video orchestrator with 3 subgraphs."""
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
    checkpointer = MemorySaver()

    subagents = [
        # Creative subgraph
        create_researcher(),
        create_copywriter(),
        create_director(),
        # Production subgraph
        create_audio_planner(),
        create_voice_generator(),
        create_sound_engineer(),
        create_validator(),
        # Delivery subgraph
        create_reviewer(),
    ]

    agent = create_deep_agent(
        model=model,
        tools=[submit_render, check_render_status],
        system_prompt=load_prompt("orchestrator"),
        checkpointer=checkpointer,
        subagents=subagents,
        skills=[str(SKILLS_DIR)],
    )

    return agent
```

- [ ] **Step 4: Run all orchestrator tests**

Run: `cd packages/agent && uv run pytest tests/test_orchestrator.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/orchestrator.py packages/agent/tests/test_orchestrator.py
git commit -m "feat(agent): rewire orchestrator with all 8 subagents in 3 subgraph structure"
```

---

### Task 15: Run full test suite and fix regressions

**Files:**

- All test files in `packages/agent/tests/`

- [ ] **Step 1: Run the complete test suite**

Run: `cd packages/agent && uv run pytest tests/ -v`
Expected: ALL PASS. If any failures, fix them before proceeding.

- [ ] **Step 2: Check for import issues**

Run: `cd packages/agent && uv run python -c "from src.orchestrator import create_video_orchestrator; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Verify render.ts still works without flag**

Run: `cd C:/Users/ldaevf1/Programs/remotion-playground && npx tsx scripts/render.ts 2>&1 | head -3`
Expected: Usage error message (no config path) — confirms script loads

- [ ] **Step 4: Commit any fixes**

Only if fixes were needed:

```bash
git add -u
git commit -m "fix(agent): resolve test regressions from graph redesign"
```

---

### Task 16: Update CHANGELOG and FUTURE.md

**Files:**

- Modify: `CHANGELOG.md`
- Modify: `FUTURE.md`

- [ ] **Step 1: Update CHANGELOG.md**

Add under `[Unreleased]`:

```markdown
### Added

- `voice_generator` subagent for Gemini TTS voiceover generation
- `audio_planner` subagent with unified audio chart checkpoint (CP3)
- `validator` subagent for config coherence checks against disk assets
- `reviewer` subagent for post-render MP4 verification
- `present_direction` tool for director timing checkpoint (CP2)
- `present_audio_chart` tool for unified audio approval
- `present_custom_scene` tool for scene creator code review (CP4)
- `generate_voiceover` tool wrapping Gemini TTS script
- `copy_library_track` tool for library-only sound design
- `validate_config` tool for pre-render asset verification
- `review_render` tool for post-render ffprobe inspection
- `--skip-audio-generation` flag in render script for agent pipeline

### Changed

- Orchestrator reorganized into 3 subgraphs: creative, production, delivery
- Director now has human checkpoint (CP2) for timing/beats approval
- Sound engineer operates in library-only mode (API generation disabled)
- Pipeline has 6 human checkpoints: escaleta, direction, audio chart, custom scenes, validator warnings, review
- `submit_render` passes `_skipAudioGeneration` flag to render service
```

- [ ] **Step 2: Update FUTURE.md**

Remove or mark as done the items that are now implemented:

- "Voiceover con ElevenLabs" → mark as partially implemented (Gemini TTS integrated in agent, ElevenLabs pending API access)
- "Musica de fondo" → mark as implemented (library-only mode, API generation pending)

Add new item:

```markdown
- **Reactivar generacion de audio via API** — cuando ElevenLabs/Lyria esten disponibles, reactivar `generate_audio` en sound_engineer y anadir fallback chain en audio_planner. El diseno ya lo soporta. (2026-04-21)
- **Paralelismo voice_generator/sound_engineer via LangGraph Send()** — el orquestador actual pide al modelo despachar ambos en paralelo via prompt. Para garantizarlo, implementar fork/join con `Send()` API de LangGraph. (2026-04-21)
- **Scene Creator integration como CompiledSubAgent** — el scene_creator se registra como subagente dict pero su grafo interno (lint → register → validate) no se ejecuta como subgrafo LangGraph. Verificar API CompiledSubAgent de DeepAgents. (2026-04-21)
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md FUTURE.md
git commit -m "docs: update CHANGELOG and FUTURE.md for graph redesign"
```
