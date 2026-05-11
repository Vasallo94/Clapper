import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Annotated, Any

from langchain_core.tools import InjectedToolArg

from ..context import resolve_config_id
from ..paths import PROJECT_ROOT as DEFAULT_PROJECT_ROOT

BUILTIN_SCENE_TYPES = {"intro", "terminal", "callout", "outro", "custom", "hero", "benefits", "pricing", "cta"}
PROJECT_ROOT = DEFAULT_PROJECT_ROOT


def _project_path(*parts: str) -> Path:
    return Path(PROJECT_ROOT).joinpath(*parts)


def _scene_registry_path() -> Path:
    return _project_path("src", "compositions", "ClaudeCodeTutorial", "customSceneRegistry.ts")


def _voiceover_base_dir() -> Path:
    return _project_path("public", "voiceover")


def _audio_base_dir() -> Path:
    return _project_path("public", "audio")


def _audio_library_dir() -> Path:
    return _project_path("public", "audio", "library")


def _parse_config(config_input: str) -> dict | str:
    """Parse JSON string or file path into a dict. Returns error string on failure."""
    try:
        return json.loads(config_input)
    except (json.JSONDecodeError, TypeError):
        p = Path(config_input)
        if not p.is_file():
            return (
                f"ERROR: Cannot read '{config_input}'. This looks like a virtual path. "
                f"Use read_file('{config_input}') first to get the JSON content, "
                f"then pass the JSON STRING to validate_config (not the path)."
            )
        return json.loads(p.read_text(encoding="utf-8"))


def _extract_json(stdout: str) -> dict | None:
    match = re.search(r"(\{[\s\S]*\})\s*$", stdout)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def _format_schema_issue(issue: dict) -> str:
    path = issue.get("path", [])
    where = ".".join(str(p) for p in path) if path else "<root>"
    message = issue.get("message", "Schema validation failed")
    return f"Schema {where}: {message}"


def _run_remotion_schema_validation(config: dict) -> tuple[list[str], list[str]]:
    """Validate with the same Zod schemas used by the Remotion render service."""
    script = _project_path("scripts", "validate-config.ts")
    package_json = _project_path("package.json")
    if not script.exists() or not package_json.exists():
        return [], ["Remotion schema validation skipped: scripts/validate-config.ts not found"]

    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tmp:
            json.dump(config, tmp)
            tmp_path = Path(tmp.name)

        result = subprocess.run(
            ["npx", "tsx", "scripts/validate-config.ts", str(tmp_path)],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(PROJECT_ROOT),
        )
    except (FileNotFoundError, subprocess.SubprocessError, OSError) as exc:
        return [], [f"Remotion schema validation skipped: {exc}"]
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)

    parsed = _extract_json(result.stdout)
    if parsed is None:
        detail = (result.stderr or result.stdout).strip()
        return [], [f"Remotion schema validation returned non-JSON output: {detail[:500]}"]
    if parsed.get("valid") is True:
        return [], []

    issues = parsed.get("errors", [])
    if isinstance(issues, list):
        return [_format_schema_issue(issue) if isinstance(issue, dict) else str(issue) for issue in issues], []
    return [str(issues)], []


def _collect_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        strings: list[str] = []
        for item in value:
            strings.extend(_collect_strings(item))
        return strings
    if isinstance(value, dict):
        strings = []
        for item in value.values():
            strings.extend(_collect_strings(item))
        return strings
    return []


def _scene_text(scene: dict) -> str:
    visible_keys = ("title", "subtitle", "text", "bullets", "items", "price", "period", "note", "headline", "props")
    strings: list[str] = []
    for key in visible_keys:
        if key in scene:
            strings.extend(_collect_strings(scene[key]))
    if scene.get("type") == "terminal":
        strings.extend(line.get("text", "") for line in scene.get("lines", []) if isinstance(line, dict))
    return " ".join(s for s in strings if s)


def _word_count(text: str) -> int:
    return len(re.findall(r"\b[\wáéíóúÁÉÍÓÚñÑüÜ]+\b", text))


def _voiceover_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        text = value.get("text")
        return text if isinstance(text, str) else ""
    return ""


def audit_content_quality(config_input: str) -> str:
    """Audit a video config for editorial quality issues.

    This is a deterministic guardrail for content generation. It does not replace
    human approval; it gives copywriter/director/audio agents concrete repair
    hints before checkpoints and rendering.

    Args:
        config_input: The full config as a JSON string, or a file path to config.json.
    """
    config = _parse_config(config_input)
    if isinstance(config, str):
        return json.dumps({"errors": [config], "warnings": [], "recommendations": []})

    errors: list[str] = []
    warnings: list[str] = []
    recommendations: list[str] = []

    scenes = config.get("scenes", [])
    if not isinstance(scenes, list) or not scenes:
        return json.dumps({"errors": ["No scenes found"], "warnings": warnings, "recommendations": recommendations})

    composition = config.get("composition", "ClaudeCodeTutorial")
    total_duration = sum(float(scene.get("durationInSeconds", 0) or 0) for scene in scenes if isinstance(scene, dict))

    if composition == "ProductShort":
        if not 10 <= total_duration <= 45:
            warnings.append(f"ProductShort duration is {total_duration:.1f}s; target 10-45s for vertical ads")
        if scenes[-1].get("type") != "cta":
            warnings.append("ProductShort should end with a cta scene")
    else:
        if total_duration < 90:
            warnings.append(
                f"Tutorial duration is {total_duration:.1f}s; default educational tutorials should be 90-180s unless the user explicitly requested a short"
            )
        if len(scenes) < 8:
            warnings.append(
                f"Tutorial has {len(scenes)} scenes; default educational tutorials should usually use 8-14 scenes for setup, demo, explanation, pitfalls, and recap"
            )
        if scenes[0].get("type") not in {"intro", "hero", "custom"}:
            warnings.append("First scene should establish a clear hook with intro, hero, or custom visual")
        if scenes[-1].get("type") not in {"outro", "cta"}:
            warnings.append("Final scene should be an outro or cta with a clear takeaway")

    brief = config.get("brief")
    if not isinstance(brief, dict):
        recommendations.append(
            "Add a brief with audience, goal, promise, tone, cta, hookStrategy, and templateId"
        )
    else:
        for key in ("audience", "goal", "promise", "tone", "cta", "hookStrategy"):
            if not brief.get(key):
                warnings.append(f"Brief is missing '{key}'")
        if not brief.get("templateId"):
            recommendations.append("Add brief.templateId from the scene catalog templates")
        if not brief.get("narrativeArc"):
            recommendations.append("Add brief.narrativeArc so downstream agents preserve the story shape")

    previous_type = ""
    for index, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            errors.append(f"Scene {index}: scene must be an object")
            continue

        scene_type = scene.get("type", "")
        duration = float(scene.get("durationInSeconds", 0) or 0)
        if duration <= 0:
            errors.append(f"Scene {index}: durationInSeconds must be greater than 0")

        if scene_type == previous_type:
            warnings.append(f"Scene {index}: repeated scene type '{scene_type}' after previous scene")
        previous_type = scene_type

        text_words = _word_count(_scene_text(scene))
        if duration > 0 and text_words / duration > 5:
            warnings.append(
                f"Scene {index}: visible copy is dense ({text_words} words in {duration:.1f}s); simplify or extend duration"
            )

        timing = scene.get("timing")
        if not isinstance(timing, dict):
            recommendations.append(f"Scene {index}: add timing fields so voice, motion, and hold are intentional")
        elif index == 0 and not timing.get("leadInMs"):
            recommendations.append("Scene 0: add leadInMs before narration or major movement")

        beats = scene.get("beats")
        if isinstance(beats, list):
            for beat in beats:
                if not isinstance(beat, dict):
                    continue
                start_ms = beat.get("startMs")
                if isinstance(start_ms, (int, float)) and duration > 0 and start_ms >= duration * 1000:
                    errors.append(f"Scene {index}: beat '{beat.get('id', '?')}' starts after the scene ends")
        elif scene_type in {"terminal", "custom", "benefits"} and duration >= 4:
            recommendations.append(f"Scene {index}: add beats for the main reveal points")

    voiceover = config.get("voiceover")
    if isinstance(voiceover, dict) and voiceover.get("enabled"):
        vo_scenes = voiceover.get("scenes", {})
        if not isinstance(vo_scenes, dict):
            errors.append("voiceover.scenes must be a record keyed by scene index")
        else:
            for scene_idx, value in vo_scenes.items():
                try:
                    index = int(scene_idx)
                except ValueError:
                    errors.append(f"voiceover.scenes key '{scene_idx}' is not a scene index")
                    continue
                if index < 0 or index >= len(scenes):
                    errors.append(f"voiceover.scenes key '{scene_idx}' does not match any scene")
                    continue
                duration = float(scenes[index].get("durationInSeconds", 0) or 0)
                words = _word_count(_voiceover_text(value))
                if duration > 0 and words / duration > 3:
                    warnings.append(
                        f"Voiceover scene {scene_idx}: {words} words in {duration:.1f}s is likely too fast"
                    )
    else:
        recommendations.append("Add voiceover for scenes where the viewer needs narrative guidance")

    return json.dumps({"errors": errors, "warnings": warnings, "recommendations": recommendations})


def validate_config(config_input: str, runtime: Annotated[Any, InjectedToolArg] = None) -> str:
    """Validate a video config against real assets on disk.

    Checks the config against the Remotion Zod schemas, verifies referenced
    scenes and assets exist, and runs an editorial quality audit.

    IMPORTANT: You must pass the full JSON content as a string, NOT a file path.
    If you have a file path like '/pipeline/config.json', first call read_file()
    to get the content, then pass that JSON string here.

    Args:
        config_input: The full config as a JSON string (not a file path).
    """
    config = _parse_config(config_input)
    if isinstance(config, str):
        return json.dumps({"errors": [config], "warnings": [], "recommendations": []})
    errors: list[str] = []
    warnings: list[str] = []
    recommendations: list[str] = []
    config_id = resolve_config_id(runtime, config)

    schema_errors, schema_warnings = _run_remotion_schema_validation(config)
    errors.extend(schema_errors)
    warnings.extend(schema_warnings)

    registry_path = _scene_registry_path()
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

    voiceover = config.get("voiceover")
    if voiceover and voiceover.get("enabled"):
        vo_dir = _voiceover_base_dir() / config_id
        scenes = voiceover.get("scenes", {})
        if isinstance(scenes, list):
            scene_keys = [str(s.get("sceneIndex", i)) for i, s in enumerate(scenes)]
        else:
            scene_keys = list(scenes.keys())
        for scene_idx in scene_keys:
            mp3_path = vo_dir / f"{scene_idx}.mp3"
            if not mp3_path.exists():
                errors.append(f"Voiceover MP3 missing for scene {scene_idx}: {mp3_path}")

    sound = config.get("soundDesign")
    if sound and sound.get("enabled"):
        library_dir = _audio_library_dir()
        music_bed = sound.get("musicBed")
        if music_bed:
            lid = music_bed.get("libraryId")
            if lid and not (library_dir / f"{lid}.mp3").exists():
                errors.append(f"Music bed libraryId '{lid}' not found in {library_dir}")

        audio_dir = _audio_base_dir() / config_id
        for sfx in sound.get("sfx", []):
            sfx_id = sfx.get("id", "")
            sfx_file = audio_dir / f"sfx-{sfx_id}.mp3"
            lib_file = library_dir / f"sfx-{sfx_id}.mp3"
            if not sfx_file.exists() and not lib_file.exists():
                warnings.append(f"SFX '{sfx_id}' not found in config audio dir or library")

    quality = json.loads(audit_content_quality(json.dumps(config)))
    errors.extend(quality.get("errors", []))
    warnings.extend(quality.get("warnings", []))
    recommendations.extend(quality.get("recommendations", []))

    return json.dumps({"errors": errors, "warnings": warnings, "recommendations": recommendations})


def review_render(output_path: str, config_input: str) -> str:
    """Review a rendered MP4 for correctness.

    Checks file existence, duration match, and audio presence via ffprobe.

    Args:
        output_path: Path to the rendered MP4 file.
        config_input: The full config as a JSON string, or a file path to config.json.
    """
    output = Path(output_path)
    config = _parse_config(config_input)
    if isinstance(config, str):
        return json.dumps({"error": config})

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
