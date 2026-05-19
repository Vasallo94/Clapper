from ..orchestrator import create_skills_middleware, load_prompt
from ..tools.pipeline import read_pipeline_plan, update_pipeline_step
from ..tools.voice import generate_voiceover


def create_voice_generator() -> dict:
    """Create the voice generator SubAgent definition."""
    return {
        "name": "voice_generator",
        "description": "Generates voiceover audio via Gemini TTS for each scene.",
        "system_prompt": load_prompt("voice_generator"),
        "tools": [read_pipeline_plan, update_pipeline_step, generate_voiceover],
        "middleware": [create_skills_middleware()],
    }
