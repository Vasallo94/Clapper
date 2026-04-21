import json
import subprocess
from pathlib import Path

from langgraph.types import interrupt

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent


def present_sound_chart(music_bed: dict, sfx_entries: list[dict]) -> str:
    """Present a sound design chart to the user for approval.

    Pauses execution and waits for the user to approve or request changes.

    Args:
        music_bed: Music bed configuration (libraryId, volume, ducking settings).
        sfx_entries: List of SFX entries with id, prompt, trigger, sceneTypes, volume.
    """
    decision = interrupt(
        {
            "type": "sound_chart_checkpoint",
            "music_bed": music_bed,
            "sfx_entries": sfx_entries,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        return "APPROVED — The user approved the sound chart. Now generate the audio files."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — {feedback}. Revise the sound chart and call present_sound_chart again."


def list_audio_library() -> str:
    """List available music tracks in the audio library."""
    library_dir = PROJECT_ROOT / "public" / "audio" / "library"
    if not library_dir.exists():
        return "No audio library found at public/audio/library/"
    tracks = sorted(d.name for d in library_dir.iterdir() if d.is_dir())
    return json.dumps(tracks) if tracks else "No tracks found."


def generate_audio(config_path: str) -> str:
    """Generate sound design audio files from a config.

    Runs the generate-sound-design.ts script.

    Args:
        config_path: Path to the config.json file.
    """
    result = subprocess.run(
        ["npx", "tsx", "scripts/generate-sound-design.ts", config_path],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        return f"Error generating audio: {result.stderr}"
    return f"Audio generated successfully. {result.stdout}"


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
