from ..orchestrator import SKILLS_DIR, load_prompt
from ..tools.sound import copy_library_track, list_audio_library


def create_sound_engineer() -> dict:
    """Create the sound engineer SubAgent definition."""
    return {
        "name": "sound_engineer",
        "description": "Prepares music bed and SFX audio assets from library.",
        "system_prompt": load_prompt("sound_engineer"),
        "tools": [list_audio_library, copy_library_track],
        "skills": [str(SKILLS_DIR)],
    }
