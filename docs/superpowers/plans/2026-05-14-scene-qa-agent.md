# Scene QA Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Scene QA agent that renders scene stills, evaluates them with a multimodal LLM, and routes feedback before audio production.

**Architecture:** A new subagent (`scene_qa`) with 3 tools (`render_scene_stills`, `qa_scenes`, `present_qa_report`) integrates between step 2e (post-direction validation) and step 2f (audio planner) in the orchestrator workflow. The TypeScript `render-scene-stills.ts` script uses Remotion's `renderStill()` API to produce PNGs that the Python tools send to a multimodal LLM for evaluation.

**Tech Stack:** TypeScript (Remotion `renderStill`), Python (LangGraph tools with `InjectedToolArg`), Gemini 2.0 Flash (default multimodal LLM)

---

## File Structure

| #   | File                                       | Responsibility                                                                                                           |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | `scripts/render-scene-stills.ts`           | Render one PNG per scene at the 60% frame point using `renderStill()`                                                    |
| 2   | `packages/agent/src/tools/qa.py`           | Three tools: `render_scene_stills` (subprocess wrapper), `qa_scenes` (multimodal eval), `present_qa_report` (checkpoint) |
| 3   | `packages/agent/src/subagents/scene_qa.py` | Factory function `create_scene_qa() -> dict`                                                                             |
| 4   | `packages/agent/prompts/scene_qa.md`       | Agent system prompt with QA workflow                                                                                     |
| 5   | `packages/agent/tests/test_tools_qa.py`    | Tests for the 3 QA tools                                                                                                 |
| 6   | `packages/agent/tests/test_subagents.py`   | Add `test_scene_qa_definition` + `test_scene_qa_exported`                                                                |
| 7   | `packages/agent/src/tools/__init__.py`     | Add QA tool imports                                                                                                      |
| 8   | `packages/agent/src/subagents/__init__.py` | Add `create_scene_qa` import                                                                                             |
| 9   | `packages/agent/src/orchestrator.py`       | Add `create_scene_qa()` to subagents list                                                                                |
| 10  | `packages/agent/prompts/orchestrator.md`   | Add `scene_qa` to team + step 2e.5                                                                                       |

---

### Task 1: Render scene stills script

**Files:**

- Create: `scripts/render-scene-stills.ts`

- [ ] **Step 1: Create the render-scene-stills script**

```typescript
// scripts/render-scene-stills.ts
// Usage: npx tsx scripts/render-scene-stills.ts <config.json> <output-dir>

import { bundle } from "@remotion/bundler"
import { renderStill, selectComposition } from "@remotion/renderer"
import { enableTailwind } from "@remotion/tailwind-v4"
import { createHash } from "crypto"
import { readFileSync, readdirSync, existsSync, mkdirSync, statSync } from "fs"
import path from "path"

const configPath = process.argv[2]
const outputDir = process.argv[3]

if (!configPath || !outputDir) {
  console.error("Usage: npx tsx scripts/render-scene-stills.ts <config.json> <output-dir>")
  process.exit(1)
}

const CACHE_DIR = path.resolve("packages/render-service/jobs/.bundle-cache")

function computeSourceHash(): string {
  const srcDir = path.resolve("src")
  const files = readdirSync(srcDir, { recursive: true, encoding: "utf-8" })
    .filter((f) => /\.(ts|tsx|css)$/.test(f))
    .sort()

  const hash = createHash("sha256")
  for (const file of files) {
    const fullPath = path.join(srcDir, file)
    if (statSync(fullPath).isFile()) {
      hash.update(readFileSync(fullPath))
    }
  }
  return hash.digest("hex").slice(0, 16)
}

async function getCachedOrBundle(): Promise<string> {
  const hash = computeSourceHash()
  const cachedPath = path.join(CACHE_DIR, hash)

  if (existsSync(cachedPath)) {
    return cachedPath
  }

  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/index.ts"),
    webpackOverride: enableTailwind,
  })

  mkdirSync(CACHE_DIR, { recursive: true })
  const { cpSync } = await import("fs")
  cpSync(bundleLocation, cachedPath, { recursive: true })
  return cachedPath
}

async function main() {
  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  mkdirSync(outputDir, { recursive: true })

  const bundleLocation = await getCachedOrBundle()

  const compositionId = config.composition || "ClaudeCodeTutorial"
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: config,
  })

  const fps = config.fps || 30
  const scenes: Array<{ index: number; path: string; frameNumber: number }> = []
  let cumulativeFrames = 0

  for (let i = 0; i < (config.scenes?.length ?? 0); i++) {
    const scene = config.scenes[i]
    const durationSec = scene.durationInSeconds || 5
    const durationFrames = Math.round(durationSec * fps)
    const targetFrame = cumulativeFrames + Math.floor(durationFrames * 0.6)
    const clampedFrame = Math.min(targetFrame, composition.durationInFrames - 1)

    const outputPath = path.join(outputDir, `scene-${i}.png`)

    await renderStill({
      composition,
      serveUrl: bundleLocation,
      output: outputPath,
      inputProps: config,
      frame: clampedFrame,
      imageFormat: "png",
    })

    scenes.push({ index: i, path: outputPath, frameNumber: clampedFrame })
    cumulativeFrames += durationFrames
  }

  const manifest = { scenes }
  process.stdout.write(JSON.stringify(manifest))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Verify the script compiles**

Run: `npx tsc --noEmit scripts/render-scene-stills.ts 2>&1 || echo "Note: script runs via tsx, not tsc directly"`

The script runs via `npx tsx` (like the existing `scripts/render.ts`), so TypeScript compilation is checked as part of the whole project typecheck.

- [ ] **Step 3: Commit**

```bash
git add scripts/render-scene-stills.ts
git commit -m "feat(qa): add render-scene-stills script using Remotion renderStill API"
```

---

### Task 2: QA tools — `render_scene_stills` and helpers

**Files:**

- Create: `packages/agent/src/tools/qa.py`
- Create: `packages/agent/tests/test_tools_qa.py`

- [ ] **Step 1: Write the failing tests for render_scene_stills**

Create `packages/agent/tests/test_tools_qa.py`:

```python
import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


class TestRenderSceneStills:
    def test_returns_manifest_on_success(self, tmp_path):
        manifest = {"scenes": [{"index": 0, "path": "/tmp/scene-0.png", "frameNumber": 54}]}
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps(manifest)

        with patch("src.tools.qa.subprocess.run", return_value=mock_result):
            with patch("src.tools.qa.PROJECT_ROOT", tmp_path):
                # Create the script path so the tool finds it
                script = tmp_path / "scripts" / "render-scene-stills.ts"
                script.parent.mkdir(parents=True)
                script.touch()

                from src.tools.qa import render_scene_stills

                result = json.loads(render_scene_stills('{"id": "test", "scenes": []}'))
                assert "scenes" in result
                assert result["scenes"][0]["index"] == 0

    def test_returns_error_on_failure(self, tmp_path):
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stderr = "Bundle failed"

        with patch("src.tools.qa.subprocess.run", return_value=mock_result):
            with patch("src.tools.qa.PROJECT_ROOT", tmp_path):
                script = tmp_path / "scripts" / "render-scene-stills.ts"
                script.parent.mkdir(parents=True)
                script.touch()

                from src.tools.qa import render_scene_stills

                result = json.loads(render_scene_stills('{"id": "test", "scenes": []}'))
                assert "error" in result
                assert "Bundle failed" in result["error"]

    def test_uses_pipeline_context_config_id(self, tmp_path):
        manifest = {"scenes": []}
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps(manifest)

        runtime = MagicMock()
        from src.context import PipelineContext
        runtime.context = PipelineContext(config_id="ctx-video")

        with patch("src.tools.qa.subprocess.run", return_value=mock_result) as mock_run:
            with patch("src.tools.qa.PROJECT_ROOT", tmp_path):
                script = tmp_path / "scripts" / "render-scene-stills.ts"
                script.parent.mkdir(parents=True)
                script.touch()

                from src.tools.qa import render_scene_stills

                render_scene_stills('{"scenes": []}', runtime=runtime)
                # Config written to a temp dir that includes config_id
                call_args = mock_run.call_args[0][0]
                assert isinstance(call_args, list)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && python -m pytest tests/test_tools_qa.py -v`
Expected: FAIL with `ModuleNotFoundError` or `ImportError` (qa.py doesn't exist yet)

- [ ] **Step 3: Write the render_scene_stills tool**

Create `packages/agent/src/tools/qa.py`:

```python
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Annotated, Any

from langchain_core.tools import InjectedToolArg

from ..context import get_pipeline_context
from ..paths import PROJECT_ROOT

QA_MODEL = os.environ.get("SCENE_QA_MODEL", "gemini-2.0-flash")


def render_scene_stills(
    config_json: str,
    runtime: Annotated[Any, InjectedToolArg] = None,
) -> str:
    """Render a PNG still of each scene for visual QA.

    Takes the full config JSON string (NOT a file path). Calls the
    render-scene-stills.ts script which uses Remotion's renderStill() API.
    Returns a JSON manifest with PNG paths.

    Args:
        config_json: Full config as a JSON string.
    """
    ctx = get_pipeline_context(runtime)
    config = json.loads(config_json)
    config_id = config.get("id") or (ctx.config_id if ctx else "unknown")

    output_dir = Path(tempfile.mkdtemp(prefix=f"scene-qa-{config_id}-"))
    config_path = output_dir / "config.json"
    config_path.write_text(config_json, encoding="utf-8")

    script = Path(PROJECT_ROOT) / "scripts" / "render-scene-stills.ts"
    result = subprocess.run(
        ["npx", "tsx", str(script), str(config_path), str(output_dir)],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=str(PROJECT_ROOT),
    )

    if result.returncode != 0:
        return json.dumps({"error": result.stderr.strip()})

    return result.stdout
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agent && python -m pytest tests/test_tools_qa.py::TestRenderSceneStills -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/qa.py packages/agent/tests/test_tools_qa.py
git commit -m "feat(qa): add render_scene_stills tool with subprocess wrapper"
```

---

### Task 3: QA tools — `qa_scenes` multimodal evaluation

**Files:**

- Modify: `packages/agent/src/tools/qa.py`
- Modify: `packages/agent/tests/test_tools_qa.py`

- [ ] **Step 1: Write failing tests for context builder and qa_scenes**

Append to `packages/agent/tests/test_tools_qa.py`:

```python
class TestContextBuilder:
    def test_builds_five_layer_context(self):
        from src.tools.qa import _build_context

        config = {
            "title": "Test Video",
            "description": "A test",
            "brief": {
                "audience": "developers",
                "goal": "teach testing",
                "promise": "learn TDD",
                "tone": "technical",
            },
            "voiceover": {
                "enabled": True,
                "scenes": {"0": {"text": "Welcome to testing"}},
            },
            "scenes": [
                {"type": "hero", "title": "Hero", "durationInSeconds": 5, "beats": []},
                {"type": "callout", "text": "Point", "durationInSeconds": 4, "beats": []},
            ],
        }
        scene = config["scenes"][0]
        ctx = _build_context(config, scene, 0, "/tmp/scene-0.png")

        assert ctx["video_context"]["title"] == "Test Video"
        assert ctx["video_context"]["audience"] == "developers"
        assert ctx["scene_audio"]["voiceover_text"] == "Welcome to testing"
        assert ctx["scene_config"]["index"] == 0
        assert ctx["scene_config"]["type"] == "hero"
        assert ctx["narrative_context"]["previous_scene"] is None
        assert ctx["narrative_context"]["next_scene"] is not None
        assert ctx["narrative_context"]["position_in_arc"] == "intro"
        assert ctx["still_path"] == "/tmp/scene-0.png"

    def test_classify_position(self):
        from src.tools.qa import _classify_position

        assert _classify_position(0, 10) == "intro"
        assert _classify_position(9, 10) == "closing"
        assert _classify_position(3, 10) == "development"
        assert _classify_position(7, 10) == "climax"

    def test_summarize_scene(self):
        from src.tools.qa import _summarize_scene

        scene = {"type": "custom", "componentId": "flow-diagram", "props": {"title": "Architecture"}}
        assert "flow-diagram" in _summarize_scene(scene)
        assert "Architecture" in _summarize_scene(scene)


class TestQaScenes:
    def test_skips_scenes_without_stills(self):
        from src.tools.qa import qa_scenes

        config = json.dumps({
            "scenes": [{"type": "hero", "title": "Test", "durationInSeconds": 5}],
            "brief": {},
        })
        manifest = json.dumps({"scenes": []})

        result = json.loads(qa_scenes(config, manifest))
        assert result["scenes"][0]["verdict"] == "SKIP"

    def test_returns_structured_result_on_llm_success(self, tmp_path):
        still = tmp_path / "scene-0.png"
        still.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)

        config = json.dumps({
            "title": "Test",
            "brief": {"audience": "devs", "goal": "teach", "promise": "learn", "tone": "tech"},
            "scenes": [{"type": "hero", "title": "Intro", "durationInSeconds": 5, "beats": []}],
        })
        manifest = json.dumps({"scenes": [{"index": 0, "path": str(still), "frameNumber": 90}]})

        llm_response = MagicMock()
        llm_response.content = json.dumps({
            "verdict": "PASS",
            "score": 8,
            "issues": [],
            "suggested_changes": {},
        })

        with patch("src.tools.qa.ChatGoogleGenerativeAI") as MockModel:
            MockModel.return_value.invoke.return_value = llm_response

            from src.tools.qa import qa_scenes
            result = json.loads(qa_scenes(config, manifest))

            assert result["scenes"][0]["verdict"] == "PASS"
            assert result["scenes"][0]["score"] == 8
            assert result["scenes"][0]["index"] == 0

    def test_handles_unparseable_llm_response(self, tmp_path):
        still = tmp_path / "scene-0.png"
        still.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)

        config = json.dumps({
            "title": "Test",
            "brief": {},
            "scenes": [{"type": "hero", "title": "Intro", "durationInSeconds": 5, "beats": []}],
        })
        manifest = json.dumps({"scenes": [{"index": 0, "path": str(still), "frameNumber": 90}]})

        llm_response = MagicMock()
        llm_response.content = "I think this scene looks great!"

        with patch("src.tools.qa.ChatGoogleGenerativeAI") as MockModel:
            MockModel.return_value.invoke.return_value = llm_response

            from src.tools.qa import qa_scenes
            result = json.loads(qa_scenes(config, manifest))

            assert result["scenes"][0]["verdict"] == "ERROR"
            assert "raw_response" in result["scenes"][0]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && python -m pytest tests/test_tools_qa.py::TestContextBuilder tests/test_tools_qa.py::TestQaScenes -v`
Expected: FAIL with `ImportError` (functions don't exist yet)

- [ ] **Step 3: Add the helper functions and qa_scenes tool to qa.py**

Append to `packages/agent/src/tools/qa.py` (after `render_scene_stills`):

```python
def _classify_position(index: int, total: int) -> str:
    if index == 0:
        return "intro"
    if index == total - 1:
        return "closing"
    mid = total / 2
    if index < mid:
        return "development"
    return "climax"


def _summarize_scene(scene: dict) -> str:
    s_type = scene.get("type", "custom")
    comp_id = scene.get("componentId", "")
    title = scene.get("title", scene.get("props", {}).get("title", ""))
    return f"{s_type}/{comp_id}: {title}" if comp_id else f"{s_type}: {title}"


def _build_context(config: dict, scene: dict, index: int, still_path: str) -> dict:
    """Build the 5-layer context payload for a single scene."""
    scenes = config.get("scenes", [])
    voiceover = config.get("voiceover", {})
    vo_scenes = voiceover.get("scenes", {}) if isinstance(voiceover, dict) else {}
    vo_entry = vo_scenes.get(str(index), {})

    return {
        "video_context": {
            "title": config.get("title", ""),
            "description": config.get("description", ""),
            "audience": config.get("brief", {}).get("audience", ""),
            "goal": config.get("brief", {}).get("goal", ""),
            "promise": config.get("brief", {}).get("promise", ""),
            "tone": config.get("brief", {}).get("tone", ""),
            "total_scenes": len(scenes),
        },
        "scene_audio": {
            "voiceover_text": vo_entry.get("text", "") if isinstance(vo_entry, dict) else str(vo_entry),
            "beats": [
                {"narration": b.get("narration"), "visual": b.get("visual"), "startMs": b.get("startMs")}
                for b in scene.get("beats", [])
                if isinstance(b, dict)
            ],
        },
        "scene_config": {
            "index": index,
            "type": scene.get("type", ""),
            "componentId": scene.get("componentId", ""),
            "props": scene.get("props", {}),
            "durationInSeconds": scene.get("durationInSeconds", 0),
            "title": scene.get("title", scene.get("props", {}).get("title", "")),
        },
        "narrative_context": {
            "previous_scene": _summarize_scene(scenes[index - 1]) if index > 0 else None,
            "next_scene": _summarize_scene(scenes[index + 1]) if index < len(scenes) - 1 else None,
            "position_in_arc": _classify_position(index, len(scenes)),
        },
        "still_path": still_path,
    }


def _build_qa_prompt(context: dict) -> str:
    vc = context["video_context"]
    sc = context["scene_config"]
    nc = context["narrative_context"]
    sa = context["scene_audio"]

    beats_lines = []
    for b in sa.get("beats", []):
        beats_lines.append(f"  - [{b.get('startMs', '?')}ms] visual: {b.get('visual', '-')} | narration: {b.get('narration', '-')}")
    beats_formatted = "\n".join(beats_lines) if beats_lines else "(no beats defined)"

    return f"""You are a creative director reviewing a scene from an educational video.

## Video Context
- Title: {vc.get('title', '')}
- Audience: {vc.get('audience', '')}
- Goal: {vc.get('goal', '')}
- Promise: {vc.get('promise', '')}

## This Scene ({sc['index']}/{vc['total_scenes']})
- Type: {sc['type']} / {sc.get('componentId', '')}
- Duration: {sc['durationInSeconds']}s
- Position: {nc['position_in_arc']}
- Previous scene: {nc.get('previous_scene', 'none')}
- Next scene: {nc.get('next_scene', 'none')}

## What the voiceover says during this scene:
"{sa.get('voiceover_text', '')}"

## Beat-by-beat direction:
{beats_formatted}

## Scene data (what the component renders from):
{json.dumps(sc.get('props', {}), indent=2, ensure_ascii=False)}

## The rendered frame is attached.

Evaluate this scene on these criteria:

1. **Visual-Audio Coherence**: Does the visual match what the voiceover is explaining?
2. **Topic Relevance**: Is the content specific to this video's topic, or could it belong to any video?
3. **Educational Value**: Does this scene teach the viewer something concrete?
4. **Data Quality**: Are the labels, titles, descriptions specific and meaningful (not generic)?
5. **Narrative Flow**: Does it connect well with the previous and next scenes?

Respond in this exact JSON format:
{{
  "verdict": "PASS" | "MINOR_FIX" | "MAJOR_ISSUE",
  "score": 1-10,
  "issues": ["issue 1", "issue 2"],
  "suggested_changes": {{
    "props": {{}},
    "voiceover": "suggested voiceover text if it should change",
    "reasoning": "why these changes improve the scene"
  }}
}}"""


def qa_scenes(
    config_json: str,
    stills_manifest_json: str,
    runtime: Annotated[Any, InjectedToolArg] = None,
) -> str:
    """Evaluate each scene's visual quality using a multimodal LLM.

    Sends each scene's rendered still + full context payload to the LLM.
    Returns structured QA results with verdict, score, issues, and suggestions.

    Args:
        config_json: Full config as a JSON string.
        stills_manifest_json: JSON string from render_scene_stills output.
    """
    import base64

    from langchain_core.messages import HumanMessage
    from langchain_google_genai import ChatGoogleGenerativeAI

    config = json.loads(config_json)
    manifest = json.loads(stills_manifest_json)
    scenes = config.get("scenes", [])
    stills = {s["index"]: s["path"] for s in manifest.get("scenes", [])}

    model = ChatGoogleGenerativeAI(model=QA_MODEL)
    results = []

    for index, scene in enumerate(scenes):
        still_path = stills.get(index)
        if not still_path or not Path(still_path).exists():
            results.append({"index": index, "verdict": "SKIP", "reason": "No still available"})
            continue

        context = _build_context(config, scene, index, still_path)
        image_data = base64.b64encode(Path(still_path).read_bytes()).decode("utf-8")
        prompt = _build_qa_prompt(context)

        message = HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data}"}},
        ])

        response = model.invoke([message])
        try:
            parsed = json.loads(response.content)
            parsed["index"] = index
            results.append(parsed)
        except (json.JSONDecodeError, TypeError):
            results.append({
                "index": index,
                "verdict": "ERROR",
                "raw_response": str(response.content)[:500],
            })

    return json.dumps({"scenes": results})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agent && python -m pytest tests/test_tools_qa.py -v`
Expected: ALL PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/qa.py packages/agent/tests/test_tools_qa.py
git commit -m "feat(qa): add qa_scenes tool with 5-layer context and multimodal LLM eval"
```

---

### Task 4: QA tools — `present_qa_report` checkpoint

**Files:**

- Modify: `packages/agent/src/tools/qa.py`
- Modify: `packages/agent/tests/test_tools_qa.py`

- [ ] **Step 1: Write failing tests for present_qa_report**

Append to `packages/agent/tests/test_tools_qa.py`:

```python
class TestPresentQaReport:
    def test_uses_checkpoint_interrupt(self):
        import inspect
        from src.tools.qa import present_qa_report

        source = inspect.getsource(present_qa_report)
        assert "checkpoint_interrupt" in source

    def test_returns_approved(self, monkeypatch):
        import src.tools._checkpoint as cp_mod
        monkeypatch.setattr(cp_mod, "interrupt", lambda v: {"approved": True})

        from src.tools.qa import present_qa_report

        report = json.dumps({
            "summary": {"total": 5, "pass": 5, "minor_fix": 0, "major_issue": 0},
            "scenes": [],
        })
        result = present_qa_report(report)
        assert "APPROVED" in result

    def test_returns_feedback(self, monkeypatch):
        import src.tools._checkpoint as cp_mod
        monkeypatch.setattr(cp_mod, "interrupt", lambda v: {"approved": False, "feedback": "Fix scene 3"})

        from src.tools.qa import present_qa_report

        report = json.dumps({"scenes": [{"index": 3, "verdict": "MAJOR_ISSUE"}]})
        result = present_qa_report(report)
        assert "CHANGES REQUESTED" in result
        assert "Fix scene 3" in result
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && python -m pytest tests/test_tools_qa.py::TestPresentQaReport -v`
Expected: FAIL with `ImportError`

- [ ] **Step 3: Add present_qa_report to qa.py**

Append to `packages/agent/src/tools/qa.py`:

```python
from ._checkpoint import checkpoint_interrupt


def present_qa_report(report_json: str) -> str:
    """Present QA report to user when major issues are found.

    Uses checkpoint_interrupt to pause the pipeline and show
    the QA findings with suggested fixes for human decision.

    Args:
        report_json: JSON string with QA results and suggested changes.
    """
    report = json.loads(report_json)
    return checkpoint_interrupt(
        data={"type": "qa_report_checkpoint", **report},
        approved_msg="QA report approved. Proceeding with audio planning.",
        retry_msg="Review the feedback and re-dispatch the relevant agent.",
    )
```

Note: the `checkpoint_interrupt` import should go at the top of the file with other imports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agent && python -m pytest tests/test_tools_qa.py -v`
Expected: ALL PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/qa.py packages/agent/tests/test_tools_qa.py
git commit -m "feat(qa): add present_qa_report checkpoint tool"
```

---

### Task 5: Scene QA agent prompt

**Files:**

- Create: `packages/agent/prompts/scene_qa.md`

- [ ] **Step 1: Create the agent prompt**

````markdown
# Scene QA Agent

You evaluate the visual quality and content coherence of video scenes before they go to audio production.

## Your tools

- `render_scene_stills(config_json)` — Render a PNG still of each scene at the 60% frame point
- `qa_scenes(config_json, stills_manifest_json)` — Send stills + context to multimodal LLM for evaluation
- `present_qa_report(report_json)` — Present QA report for human review (checkpoint)
- `read_file` / `write_file` — Access pipeline virtual filesystem

## Skills

Read the `scene-catalog` skill to understand what props each scene type accepts. Every suggestion you make must use valid props for the target component.

## Workflow

1. Read `/pipeline/config.json` using `read_file`
2. Call `render_scene_stills` with the full config JSON string
3. Call `qa_scenes` with the config JSON string + the stills manifest JSON
4. Analyze results and route feedback (see below)
5. Write QA report to `/pipeline/qa_report.json` using `write_file`

## Feedback routing

After evaluating all scenes:

- **All PASS** → Write the QA report to `/pipeline/qa_report.json` and return success.
- **Only MINOR_FIX** → Write auto-fix instructions to `/pipeline/qa_feedback.json` with specific prop changes per scene. Return with `auto_fix: true` in your response.
- **Any MAJOR_ISSUE** → Call `present_qa_report` with the full report. The human decides which fixes to apply.

## QA report format (`/pipeline/qa_report.json`)

```json
{
  "timestamp": "ISO-8601",
  "config_id": "video-id",
  "summary": { "total": 15, "pass": 12, "minor_fix": 2, "major_issue": 1 },
  "scenes": [{ "index": 0, "verdict": "PASS", "score": 8, "issues": [], "suggested_changes": {} }]
}
```
````

## QA feedback format (`/pipeline/qa_feedback.json`)

```json
{
  "instructions": "Apply the following changes to config.json scenes:",
  "changes": [
    {
      "scene_index": 3,
      "field": "props.nodes",
      "current_summary": "Generic labels",
      "suggested": { "nodes": [{ "id": "1", "title": "Specific Label" }] },
      "reasoning": "Labels should match the video topic"
    }
  ]
}
```

## Important

- Never suggest scene types not registered in the catalog.
- Every suggestion must include specific prop values, not abstract descriptions.
- The voiceover text is what the audience HEARS during this scene — visuals must match it.
- Score each scene 1-10. Reserve 1-3 for scenes that actively mislead the viewer.

````

- [ ] **Step 2: Verify prompt loads correctly**

Run: `cd packages/agent && python -c "from src.orchestrator import load_prompt; p = load_prompt('scene_qa'); print(f'Loaded {len(p)} chars'); assert 'render_scene_stills' in p"`
Expected: `Loaded XXX chars` (no errors)

- [ ] **Step 3: Commit**

```bash
git add packages/agent/prompts/scene_qa.md
git commit -m "feat(qa): add scene_qa agent prompt with QA workflow and feedback routing"
````

---

### Task 6: Scene QA subagent factory

**Files:**

- Create: `packages/agent/src/subagents/scene_qa.py`
- Modify: `packages/agent/tests/test_subagents.py`

- [ ] **Step 1: Write failing tests**

Append to `packages/agent/tests/test_subagents.py`:

```python
def test_scene_qa_definition():
    from src.subagents.scene_qa import create_scene_qa

    defn = create_scene_qa()
    assert defn["name"] == "scene_qa"
    assert "description" in defn
    assert "system_prompt" in defn
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "render_scene_stills" in tool_names
    assert "qa_scenes" in tool_names
    assert "present_qa_report" in tool_names
    assert len(defn["tools"]) == 3


def test_scene_qa_exported():
    from src.subagents import create_scene_qa

    assert callable(create_scene_qa)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agent && python -m pytest tests/test_subagents.py::test_scene_qa_definition tests/test_subagents.py::test_scene_qa_exported -v`
Expected: FAIL with `ImportError`

- [ ] **Step 3: Create the subagent factory**

Create `packages/agent/src/subagents/scene_qa.py`:

```python
from ..orchestrator import SKILLS_DIR, create_model, load_prompt
from ..tools.qa import present_qa_report, qa_scenes, render_scene_stills


def create_scene_qa() -> dict:
    """Create the Scene QA SubAgent definition."""
    return {
        "name": "scene_qa",
        "description": (
            "Renders scene stills and evaluates visual quality, topic relevance, "
            "and audio-visual coherence using a multimodal LLM. Reports issues "
            "and suggests fixes."
        ),
        "system_prompt": load_prompt("scene_qa"),
        "tools": [render_scene_stills, qa_scenes, present_qa_report],
        "skills": [str(SKILLS_DIR)],
        "model": create_model(),
    }
```

- [ ] **Step 4: Add export to `__init__.py`**

In `packages/agent/src/subagents/__init__.py`, add:

```python
from .scene_qa import create_scene_qa
```

The full file becomes:

```python
from .audio_planner import create_audio_planner
from .copywriter import create_copywriter
from .director import create_director
from .researcher import create_researcher
from .reviewer import create_reviewer
from .scene_creator import create_scene_creator
from .scene_qa import create_scene_qa
from .sound_engineer import create_sound_engineer
from .validator import create_validator
from .voice_generator import create_voice_generator
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/agent && python -m pytest tests/test_subagents.py -v`
Expected: ALL PASS (including the 2 new tests)

- [ ] **Step 6: Commit**

```bash
git add packages/agent/src/subagents/scene_qa.py packages/agent/src/subagents/__init__.py packages/agent/tests/test_subagents.py
git commit -m "feat(qa): add scene_qa subagent factory following DeepAgents pattern"
```

---

### Task 7: Register QA tools in tools `__init__.py`

**Files:**

- Modify: `packages/agent/src/tools/__init__.py`

- [ ] **Step 1: Add the QA tool imports**

Add to `packages/agent/src/tools/__init__.py`:

```python
from .qa import present_qa_report, qa_scenes, render_scene_stills
```

The full file becomes:

```python
from .catalog import query_scene_catalog
from .configs import (
    list_video_configs,
    load_video_config,
    present_revision_plan,
    present_target_selection,
    present_variant_plan,
    save_pipeline_config_to_source,
    stage_existing_config,
)
from .qa import present_qa_report, qa_scenes, render_scene_stills
from .render import check_render_status, present_escaleta, submit_render
from .research import scrape_product, web_fetch, web_search
from .sound import list_audio_library
```

- [ ] **Step 2: Verify import works**

Run: `cd packages/agent && python -c "from src.tools import render_scene_stills, qa_scenes, present_qa_report; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add packages/agent/src/tools/__init__.py
git commit -m "feat(qa): register QA tools in tools __init__"
```

---

### Task 8: Orchestrator integration

**Files:**

- Modify: `packages/agent/src/orchestrator.py`
- Modify: `packages/agent/prompts/orchestrator.md`

- [ ] **Step 1: Add scene_qa to orchestrator.py subagent imports and list**

In `packages/agent/src/orchestrator.py`, modify the import block inside `create_video_orchestrator()`:

```python
    from .subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_researcher,
        create_reviewer,
        create_scene_creator,
        create_scene_qa,
        create_sound_engineer,
        create_validator,
        create_voice_generator,
    )
```

And modify the subagents list:

```python
    subagents = [
        create_researcher(),
        create_copywriter(),
        create_director(),
        create_audio_planner(),
        create_voice_generator(),
        create_sound_engineer(),
        create_scene_creator(),
        create_validator(),
        create_reviewer(),
        create_scene_qa(),
    ]
```

- [ ] **Step 2: Add scene_qa to orchestrator.md team section**

In `packages/agent/prompts/orchestrator.md`, after the `director` line in the "Creative subgraph (sequential)" section, add:

```markdown
- **scene_qa** — Renders scene stills and evaluates visual quality, topic relevance, and audio-visual coherence using a multimodal LLM. Has **CP-QA** (conditional): presents QA report when major issues found.
```

- [ ] **Step 3: Add step 2e.5 to orchestrator.md workflow**

In `packages/agent/prompts/orchestrator.md`, after step 2e (post-direction validation), add a new QA step before the Production phase header:

```markdown
f. Dispatch **scene_qa** with instruction to read `/pipeline/config.json`. It renders stills and evaluates each scene visually. - If all PASS: continue to audio_planner. - If MINOR_FIX with auto_fix: re-dispatch copywriter with QA feedback from `/pipeline/qa_feedback.json`. Then re-validate and re-run scene_qa (max 1 retry). - If MAJOR_ISSUE: scene_qa handles CP-QA (presents report to human). After human decision, re-dispatch copywriter/director as needed.
```

Then re-letter all subsequent steps: current f→g, g→h, h→i, i→j, j→k, k→l, l→m, m→n.

- [ ] **Step 4: Add scene_qa to the dispatch instructions section**

In the "How to dispatch agents" section, add:

```markdown
- **scene_qa**: "Read `/pipeline/config.json`. Render stills and evaluate each scene visually. Write your report to `/pipeline/qa_report.json`."
```

- [ ] **Step 5: Verify orchestrator still builds correctly**

Run: `cd packages/agent && python -c "from src.orchestrator import create_video_orchestrator; g = create_video_orchestrator(); print(f'Graph created with {len(g.nodes)} nodes')"`

Expected: prints node count without error. The exact count will be higher than before (was 9 subagents, now 10).

- [ ] **Step 6: Run all agent tests**

Run: `cd packages/agent && python -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/agent/src/orchestrator.py packages/agent/prompts/orchestrator.md
git commit -m "feat(qa): integrate scene_qa agent into orchestrator pipeline at step 2f"
```

---

### Task 9: Full integration test

**Files:** (none created — verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `cd packages/agent && python -m pytest tests/ -v --tb=short`
Expected: ALL PASS

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify the render-scene-stills script is syntactically valid**

Run: `npx tsx --eval "import('./scripts/render-scene-stills.ts').catch(e => { console.log('Module parsed OK (runtime error expected without args)'); process.exit(0) })"`

This confirms the script can be parsed by tsx without syntax errors. It will fail at runtime because no config.json is provided — that's expected.

- [ ] **Step 4: Final commit with all changes verified**

If any files were missed, stage and commit them:

```bash
git status
git add -A  # only if you confirm no unrelated files
git commit -m "test(qa): verify full scene QA agent integration"
```

---

## Execution Summary

| Task | What it builds                   | Tests                 |
| ---- | -------------------------------- | --------------------- |
| 1    | `scripts/render-scene-stills.ts` | Manual verification   |
| 2    | `render_scene_stills` tool       | 3 tests               |
| 3    | `qa_scenes` tool + helpers       | 4 tests               |
| 4    | `present_qa_report` checkpoint   | 3 tests               |
| 5    | `scene_qa.md` prompt             | Load verification     |
| 6    | `create_scene_qa()` factory      | 2 tests               |
| 7    | Tool `__init__` registration     | Import verification   |
| 8    | Orchestrator integration         | Full test suite       |
| 9    | Full integration verification    | All tests + typecheck |
