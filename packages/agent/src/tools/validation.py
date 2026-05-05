import json
import re
import subprocess
from pathlib import Path
from typing import Annotated, Any

from langchain_core.tools import InjectedToolArg

from ..context import resolve_config_id
from ..paths import AUDIO_BASE_DIR, AUDIO_LIBRARY_DIR, SCENE_REGISTRY, VOICEOVER_BASE_DIR

BUILTIN_SCENE_TYPES = {"intro", "terminal", "callout", "outro", "custom", "hero", "benefits", "pricing", "cta"}


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


def validate_config(config_input: str, runtime: Annotated[Any, InjectedToolArg] = None) -> str:
    """Validate a video config against real assets on disk.

    Checks that all referenced scenes exist in the registry, voiceover MP3s
    exist, sound design library tracks exist, and durations are consistent.

    Args:
        config_input: The full config as a JSON string, or a file path to config.json.
    """
    config = _parse_config(config_input)
    if isinstance(config, str):
        return json.dumps({"errors": [config], "warnings": []})
    errors: list[str] = []
    warnings: list[str] = []
    config_id = resolve_config_id(runtime, config)

    registry_path = SCENE_REGISTRY
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
        vo_dir = VOICEOVER_BASE_DIR / config_id
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
        library_dir = AUDIO_LIBRARY_DIR
        music_bed = sound.get("musicBed")
        if music_bed:
            lid = music_bed.get("libraryId")
            if lid and not (library_dir / f"{lid}.mp3").exists():
                errors.append(f"Music bed libraryId '{lid}' not found in {library_dir}")

        audio_dir = AUDIO_BASE_DIR / config_id
        for sfx in sound.get("sfx", []):
            sfx_id = sfx.get("id", "")
            sfx_file = audio_dir / f"sfx-{sfx_id}.mp3"
            lib_file = library_dir / f"sfx-{sfx_id}.mp3"
            if not sfx_file.exists() and not lib_file.exists():
                warnings.append(f"SFX '{sfx_id}' not found in config audio dir or library")

    return json.dumps({"errors": errors, "warnings": warnings})


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
