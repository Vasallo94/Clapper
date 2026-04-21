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
