import base64
import hashlib
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Annotated, Any

from langchain_core.tools import InjectedToolArg

from ..context import resolve_config_id
from ..paths import voiceover_dir

GEMINI_TTS_VOICES = {"Orus", "Kore", "Aoede", "Puck", "Charon", "Fenrir", "Leda", "Zephyr"}
DEFAULT_VOICE = "Orus"


def _sanitize_voice_id(voice_id: str) -> str:
    if voice_id in GEMINI_TTS_VOICES:
        return voice_id
    logger_msg = f"voice_id '{voice_id}' is not a valid Gemini TTS voice, falling back to '{DEFAULT_VOICE}'"
    import logging
    logging.getLogger(__name__).warning(logger_msg)
    return DEFAULT_VOICE


def _find_ffmpeg() -> str:
    import shutil

    env_path = os.environ.get("FFMPEG_PATH")
    if env_path:
        return env_path
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    raise FileNotFoundError("ffmpeg not found in PATH. Install ffmpeg or set FFMPEG_PATH env var.")


def _get_genai_client():
    from google import genai

    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if creds_path and Path(creds_path).exists():
        sa = json.loads(Path(creds_path).read_text(encoding="utf-8"))
        project = sa.get("project_id", os.environ.get("GOOGLE_CLOUD_PROJECT", ""))
        if project:
            return genai.Client(vertexai=True, project=project, location="us-central1")

    api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if api_key:
        return genai.Client(api_key=api_key)

    return None


def _pcm_to_mp3(pcm_path: Path, mp3_path: Path) -> None:
    ffmpeg = _find_ffmpeg()
    subprocess.run(
        [ffmpeg, "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", str(pcm_path), "-y", str(mp3_path)],
        capture_output=True,
        check=True,
        timeout=30,
    )
    pcm_path.unlink(missing_ok=True)


def _fingerprint(scene_index: str, text: str, voice_id: str, language: str, provider: str) -> str:
    payload = json.dumps({"provider": provider, "voiceId": voice_id, "language": language, "scene": scene_index, "text": text})
    return hashlib.sha256(payload.encode()).hexdigest()


def _generate_scene_audio(client, scene_index: str, text: str, voice_id: str, language: str, out_dir: Path) -> str:
    mp3_path = out_dir / f"{scene_index}.mp3"
    meta_path = out_dir / f"{scene_index}.meta.json"
    fp = _fingerprint(scene_index, text, voice_id, language, "gemini")

    if mp3_path.exists() and meta_path.exists():
        existing = json.loads(meta_path.read_text(encoding="utf-8"))
        if existing.get("fingerprint") == fp:
            return f"scene {scene_index}: skipped (cached)"

    max_retries = 3
    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model="gemini-3.1-flash-tts-preview",
                contents=text,
                config={
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "language_code": language,
                        "voice_config": {
                            "prebuilt_voice_config": {"voice_name": voice_id},
                        },
                    },
                },
            )
            break
        except Exception as e:
            if "429" in str(e) and attempt < max_retries:
                time.sleep(15 * (attempt + 1))
                continue
            raise

    audio_part = response.candidates[0].content.parts[0]
    raw = audio_part.inline_data.data
    if isinstance(raw, bytes):
        pcm_data = raw
    elif isinstance(raw, str):
        padded = raw + "=" * (-len(raw) % 4)
        pcm_data = base64.b64decode(padded)
    else:
        raise ValueError(f"Unexpected audio data type: {type(raw)}")
    pcm_path = out_dir / f"{scene_index}.pcm"
    pcm_path.write_bytes(pcm_data)
    _pcm_to_mp3(pcm_path, mp3_path)
    meta_path.write_text(json.dumps({"fingerprint": fp}), encoding="utf-8")
    return f"scene {scene_index}: OK ({mp3_path.stat().st_size} bytes)"


def generate_voiceover(config_json: str, runtime: Annotated[Any, InjectedToolArg] = None) -> str:
    """Generate voiceover audio for all scenes using Gemini TTS.

    Reads the voiceover config, calls Gemini TTS for each scene with text,
    converts PCM to MP3 via ffmpeg, and saves to public/voiceover/<id>/.

    Args:
        config_json: The full video config as a JSON string, or a file path to config.json.
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
    config_id = resolve_config_id(runtime, config)
    out_dir = voiceover_dir(config_id)

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
