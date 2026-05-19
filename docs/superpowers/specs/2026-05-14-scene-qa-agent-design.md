# Scene QA Agent — Design Spec

**Date:** 2026-05-14
**Status:** Draft
**Author:** Enrique + Claude

## Problem

The video generation pipeline produces scenes whose visual content is often generic and disconnected from the video's topic. The agent sends structured data (nodes, items, labels) but nobody verifies whether the rendered result actually conveys the right message for the target audience. The existing reviewer agent only checks post-render metadata (duration, audio presence, file size) — it never looks at what the video actually shows.

Example: A flow-diagram scene titled "Pipeline Completo de Alto Nivel" renders with vague labels like "Prompt Natural" → "Orquestador" → "MP4" instead of showing the real internal architecture of the system.

## Solution

A **Scene QA agent** that runs pre-render (after direction, before audio production) to:

1. Render a still frame (PNG) of each scene using Remotion's `renderStill()` API
2. Send the still + full context (5-layer payload) to a multimodal LLM for evaluation
3. Classify results and route feedback: auto-fix minor issues, checkpoint major ones

## Architecture

### Position in pipeline

```
researcher → copywriter (CP1) → director (CP2) → validate
                                                      ↓
                                              ★ scene_qa ★  ← NEW
                                                      ↓
                                              (feedback loop if needed)
                                                      ↓
                                              audio_planner (CP3) → ...
```

The Scene QA runs between step 2e (post-direction validation) and step 2f (audio planner). This is the last moment to catch content issues before committing to audio generation and full render.

---

## Components

### 1. `scripts/render-scene-stills.ts` (Node.js script)

TypeScript script that renders individual scene frames as PNGs using Remotion's `renderStill()` API.

**Input:** Config JSON path + output directory
**Output:** One PNG per scene at `<output_dir>/scene-<index>.png`

```typescript
// Usage: npx tsx scripts/render-scene-stills.ts <config.json> <output-dir>

import { bundle } from "@remotion/bundler"
import { renderStill, selectComposition } from "@remotion/renderer"

// Logic:
// 1. Bundle the Remotion project (reuse bundle cache from scripts/render.ts)
// 2. selectComposition() with the config's composition ID + inputProps
// 3. For each scene, calculate target frame:
//    - Sum durations of preceding scenes → scene start frame
//    - Target = startFrame + Math.floor(sceneDurationFrames * 0.6)
//    (60% point — most content is visible)
// 4. renderStill() for each frame → PNG output
// 5. Write JSON manifest to stdout:
//    { "scenes": [{ "index": 0, "path": "/tmp/qa/scene-0.png", "frameNumber": 54 }] }
```

**Performance:** ~1-3s per scene (`renderStill` is fast). 15-scene video: ~15-45s total.

---

### 2. `packages/agent/src/tools/qa.py` (Python tools)

Two tools following the DeepAgents tool pattern with `InjectedToolArg` for runtime access.

#### Tool: `render_scene_stills`

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


def render_scene_stills(
    config_json: str,
    runtime: Annotated[Any, InjectedToolArg] = None,
) -> str:
    """Render a PNG still of each scene for visual QA.

    Takes the full config JSON string (NOT a file path). Writes PNGs to a
    temp directory and returns a JSON manifest with paths.

    Args:
        config_json: Full config as a JSON string.
    """
    ctx = get_pipeline_context(runtime)
    config = json.loads(config_json)
    config_id = config.get("id", ctx.config_id if ctx else "unknown")

    output_dir = Path(tempfile.mkdtemp(prefix=f"scene-qa-{config_id}-"))

    # Write config to temp file for the TS script
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

    manifest = json.loads(result.stdout)
    return json.dumps(manifest)
```

#### Tool: `qa_scenes`

```python
import base64
import json
import os
from pathlib import Path
from typing import Annotated, Any

from langchain_core.tools import InjectedToolArg


QA_MODEL = os.environ.get("SCENE_QA_MODEL", "gemini-2.0-flash")


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


def qa_scenes(
    config_json: str,
    stills_manifest_json: str,
    runtime: Annotated[Any, InjectedToolArg] = None,
) -> str:
    """Evaluate each scene's visual quality using a multimodal LLM.

    Sends each scene's rendered still + full context to the LLM for evaluation.
    Returns structured QA results per scene.

    Args:
        config_json: Full config as a JSON string.
        stills_manifest_json: JSON string from render_scene_stills output.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage

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

        # Read image as base64
        image_data = base64.b64encode(Path(still_path).read_bytes()).decode("utf-8")

        prompt = _build_qa_prompt(context)
        message = HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data}"}},
        ])

        response = model.invoke([message])
        # Parse LLM JSON response
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

The `_build_qa_prompt()` function generates the evaluation prompt (see section below).

#### Tool: `present_qa_report`

```python
from .._checkpoint import checkpoint_interrupt


def present_qa_report(report_json: str) -> str:
    """Present QA report to user for review when major issues are found.

    Uses checkpoint_interrupt to pause the pipeline and present
    the QA findings with suggested fixes for human decision.

    Args:
        report_json: JSON string with QA results and suggested changes.
    """
    report = json.loads(report_json)
    return checkpoint_interrupt(
        data=report,
        approved_msg="QA report approved. Proceeding with audio planning.",
        retry_msg="Review the feedback and re-dispatch the relevant agent.",
    )
```

---

### 3. LLM evaluation prompt

```
You are a creative director reviewing a scene from an educational video.

## Video Context
- Title: {title}
- Audience: {audience}
- Goal: {goal}
- Promise: {promise}

## This Scene ({index}/{total})
- Type: {type} / {componentId}
- Duration: {durationInSeconds}s
- Position: {position_in_arc}
- Previous scene: {previous_summary}
- Next scene: {next_summary}

## What the voiceover says during this scene:
"{voiceover_text}"

## Beat-by-beat direction:
{beats_formatted}

## Scene data (what the component renders from):
{props_json}

## The rendered frame is attached.

Evaluate this scene on these criteria:

1. **Visual-Audio Coherence**: Does the visual match what the voiceover is explaining?
2. **Topic Relevance**: Is the content specific to this video's topic, or could it belong to any video?
3. **Educational Value**: Does this scene teach the viewer something concrete?
4. **Data Quality**: Are the labels, titles, descriptions specific and meaningful (not generic)?
5. **Narrative Flow**: Does it connect well with the previous and next scenes?

Respond in this exact JSON format:
{
  "verdict": "PASS" | "MINOR_FIX" | "MAJOR_ISSUE",
  "score": 1-10,
  "issues": ["issue 1", "issue 2"],
  "suggested_changes": {
    "props": { /* specific prop changes if applicable */ },
    "voiceover": "suggested voiceover text if it should change",
    "reasoning": "why these changes improve the scene"
  }
}
```

---

### 4. `packages/agent/src/subagents/scene_qa.py` (Subagent factory)

Follows the established DeepAgents factory pattern (returns `dict` with `name`, `description`, `system_prompt`, `tools`, optional `skills` and `model`).

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

---

### 5. `packages/agent/prompts/scene_qa.md` (Agent prompt)

```markdown
# Scene QA Agent

You evaluate the visual quality and content coherence of video scenes before they go to audio production.

## Your tools

- `render_scene_stills(config_json)` — Render a PNG still of each scene (60% point)
- `qa_scenes(config_json, stills_manifest_json)` — Send stills + context to multimodal LLM for evaluation
- `present_qa_report(report_json)` — Present QA report for human review (checkpoint)
- `read_file` / `write_file` — Access pipeline filesystem

## Workflow

1. Read `/pipeline/config.json` using `read_file`
2. Call `render_scene_stills` with the config JSON string
3. Call `qa_scenes` with the config JSON string + the stills manifest
4. Analyze results and route feedback:

### Feedback routing

- **All PASS** → Write QA report to `/pipeline/qa_report.json`, return success
- **Only MINOR_FIX** → Auto-generate revision instructions in `/pipeline/qa_feedback.json` with
  specific prop changes. Return with `auto_fix: true`.
- **Any MAJOR_ISSUE** → Call `present_qa_report` with:
  - The QA analysis for problematic scenes
  - Suggested fixes with specific prop/voiceover changes
  - Let the human decide what to apply

## QA report format (`/pipeline/qa_report.json`)

{
"timestamp": "2026-05-14T...",
"config_id": "...",
"summary": { "total": 15, "pass": 12, "minor_fix": 2, "major_issue": 1 },
"scenes": [{ "index": 0, "verdict": "PASS", "score": 8, ... }]
}

## QA feedback format (`/pipeline/qa_feedback.json`)

{
"instructions": "Apply the following changes to config.json scenes:",
"changes": [
{
"scene_index": 3,
"field": "props.nodes",
"current": [...],
"suggested": [...],
"reasoning": "..."
}
]
}

## Important

- Read the `scene-catalog` skill to understand what props each scene type accepts.
- Every suggestion must use valid props for the target component.
- Never suggest scene types not registered in the catalog.
```

---

### 6. Orchestrator integration

#### `packages/agent/src/orchestrator.py` changes

Add `create_scene_qa` to the subagent imports and list:

```python
# In imports
from .subagents import (
    ...,
    create_scene_qa,
)

# In subagents list
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
    create_scene_qa(),  # NEW
]
```

#### `packages/agent/prompts/orchestrator.md` changes

Add step 2e.5 between validation and audio_planner:

```
e.5. Dispatch **scene_qa** with instruction to read `/pipeline/config.json`.
     It renders stills and evaluates each scene visually.
     - If all PASS: continue to audio_planner.
     - If MINOR_FIX with auto_fix: re-dispatch copywriter with QA feedback
       from `/pipeline/qa_feedback.json`. Then re-validate and re-run scene_qa
       (max 1 retry).
     - If MAJOR_ISSUE: scene_qa handles CP (presents report to human).
       After human decision, re-dispatch copywriter/director as needed.
```

Add `scene_qa` to the team description section:

```
- **scene_qa** — Renders scene stills and evaluates visual quality using multimodal
  LLM. Has **CP-QA** (conditional): presents QA report when major issues found.
```

#### `packages/agent/src/subagents/__init__.py` changes

```python
from .scene_qa import create_scene_qa
```

#### `packages/agent/src/tools/__init__.py` changes

```python
from .qa import render_scene_stills, qa_scenes, present_qa_report
```

---

## File inventory

### New files

| #   | File                                       | Type       | Description                                                    |
| --- | ------------------------------------------ | ---------- | -------------------------------------------------------------- |
| 1   | `scripts/render-scene-stills.ts`           | TypeScript | Renders one PNG per scene via `renderStill()`                  |
| 2   | `packages/agent/src/tools/qa.py`           | Python     | Tools: `render_scene_stills`, `qa_scenes`, `present_qa_report` |
| 3   | `packages/agent/src/subagents/scene_qa.py` | Python     | Subagent factory: `create_scene_qa() -> dict`                  |
| 4   | `packages/agent/prompts/scene_qa.md`       | Markdown   | Agent prompt with QA workflow and feedback routing             |

### Modified files

| #   | File                                       | Change                                                         |
| --- | ------------------------------------------ | -------------------------------------------------------------- |
| 1   | `packages/agent/src/tools/__init__.py`     | Import `render_scene_stills`, `qa_scenes`, `present_qa_report` |
| 2   | `packages/agent/src/subagents/__init__.py` | Import and export `create_scene_qa`                            |
| 3   | `packages/agent/prompts/orchestrator.md`   | Add step 2e.5 + `scene_qa` to team description                 |
| 4   | `packages/agent/src/orchestrator.py`       | Add `create_scene_qa()` to subagents list                      |

---

## Environment variables

| Variable           | Default            | Description                          |
| ------------------ | ------------------ | ------------------------------------ |
| `SCENE_QA_MODEL`   | `gemini-2.0-flash` | Multimodal LLM for visual evaluation |
| `SCENE_QA_ENABLED` | `true`             | Skip QA for quick iterations         |

---

## DeepAgents pattern compliance

| Pattern                  | How this spec follows it                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Subagent factory         | `create_scene_qa() -> dict` with `name`, `description`, `system_prompt`, `tools`, `skills`, `model` |
| Tool injection           | `runtime: Annotated[Any, InjectedToolArg]` on `render_scene_stills` and `qa_scenes`                 |
| PipelineContext          | `get_pipeline_context(runtime)` for `config_id` and `output_dir`                                    |
| Checkpoint               | `checkpoint_interrupt()` from `_checkpoint.py` for `present_qa_report`                              |
| Virtual filesystem       | `/pipeline/qa_report.json` and `/pipeline/qa_feedback.json` via `read_file`/`write_file`            |
| Skills                   | Access to `SKILLS_DIR` for scene-catalog reference                                                  |
| Prompt loading           | `load_prompt("scene_qa")` from `prompts/scene_qa.md`                                                |
| Orchestrator integration | Added to `subagents` list and `orchestrator.md` workflow                                            |

---

## Cost estimate

| Model            | Cost per scene       | 15-scene video |
| ---------------- | -------------------- | -------------- |
| Gemini 2.0 Flash | ~$0.01-0.03          | ~$0.15-0.45    |
| Claude Sonnet    | ~$0.05-0.10          | ~$0.75-1.50    |
| Render stills    | Free (local compute) | ~30-45s        |

---

## Verification

1. `scripts/render-scene-stills.ts` on existing config → verify PNGs generated at correct frame positions
2. QA tool on the "Generación de Vídeos con IA" config → verify it flags generic flow-diagram / icon-grid scenes
3. `npx tsc --noEmit` — TypeScript clean
4. `pytest packages/agent/tests/` — existing tests unaffected
5. Docker compose: full pipeline run → verify QA step integrates between direction and audio
6. Feedback loop: verify copywriter receives and applies QA feedback from `/pipeline/qa_feedback.json`
7. Checkpoint: verify MAJOR_ISSUE scenes trigger `present_qa_report` → human review with LLM analysis
