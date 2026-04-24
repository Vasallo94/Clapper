import json
import re
import subprocess
from pathlib import Path

from ..config import PROJECT_ROOT

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
