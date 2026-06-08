from ..orchestrator import MODEL_FLASH, create_model, create_skills_middleware, load_prompt
from ..tools.pipeline import read_pipeline_plan, record_pipeline_decision, update_pipeline_step
from ..tools.sound import list_audio_library, present_audio_chart


def create_audio_planner() -> dict:
    """Create the audio planner SubAgent definition."""
    return {
        "name": "audio_planner",
        "description": "Designs unified audio chart (voiceover + music + SFX) with human approval checkpoint.",
        "system_prompt": load_prompt("audio_planner"),
        "model": create_model(MODEL_FLASH),
        "tools": [read_pipeline_plan, update_pipeline_step, record_pipeline_decision, present_audio_chart, list_audio_library],
        "middleware": [create_skills_middleware()],
    }
