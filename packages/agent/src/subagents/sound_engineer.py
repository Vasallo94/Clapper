from ..orchestrator import MODEL_FLASH, create_model, create_skills_middleware, load_prompt
from ..tools.pipeline import read_pipeline_plan, update_pipeline_step
from ..tools.sound import copy_library_track, list_audio_library


def create_sound_engineer() -> dict:
    """Create the sound engineer SubAgent definition."""
    return {
        "name": "sound_engineer",
        "description": "Prepares music bed and SFX audio assets from library.",
        "system_prompt": load_prompt("sound_engineer"),
        "model": create_model(MODEL_FLASH),
        "tools": [read_pipeline_plan, update_pipeline_step, list_audio_library, copy_library_track],
        "middleware": [create_skills_middleware()],
    }
