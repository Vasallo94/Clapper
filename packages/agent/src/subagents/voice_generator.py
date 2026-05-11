from ..orchestrator import SKILLS_DIR, load_prompt
from ..tools.voice import generate_voiceover


def create_voice_generator() -> dict:
    """Create the voice generator SubAgent definition."""
    return {
        "name": "voice_generator",
        "description": "Generates voiceover audio via Gemini TTS for each scene.",
        "system_prompt": load_prompt("voice_generator"),
        "tools": [generate_voiceover],
        "skills": [str(SKILLS_DIR)],
    }
