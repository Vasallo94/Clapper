from ..orchestrator import load_prompt
from ..tools.sound import generate_audio, list_audio_library, present_sound_chart


def create_sound_engineer() -> dict:
    """Create the sound engineer SubAgent definition."""
    return {
        "name": "sound_engineer",
        "description": "Designs music bed and SFX with human approval checkpoint.",
        "system_prompt": load_prompt("sound_engineer"),
        "tools": [present_sound_chart, generate_audio, list_audio_library],
    }
