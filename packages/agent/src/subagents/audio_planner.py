from ..orchestrator import SKILLS_DIR, load_prompt
from ..tools.sound import list_audio_library, present_audio_chart


def create_audio_planner() -> dict:
    """Create the audio planner SubAgent definition."""
    return {
        "name": "audio_planner",
        "description": "Designs unified audio chart (voiceover + music + SFX) with human approval checkpoint.",
        "system_prompt": load_prompt("audio_planner"),
        "tools": [present_audio_chart, list_audio_library],
        "skills": [str(SKILLS_DIR)],
    }
