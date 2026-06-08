from ..orchestrator import MODEL_FLASH, create_model, create_skills_middleware, load_prompt
from ..tools.pipeline import read_pipeline_plan, record_pipeline_decision, update_pipeline_step
from ..tools.qa import present_qa_report, qa_scenes, render_scene_stills


def create_scene_qa() -> dict:
    """Create the Scene QA SubAgent definition."""
    return {
        "name": "scene_qa",
        "description": (
            "Renders scene stills and evaluates visual quality, topic relevance, "
            "and audio-visual coherence using a multimodal LLM. Reports issues "
            "and suggests fixes."
        ),
        "system_prompt": load_prompt("scene_qa"),
        "model": create_model(MODEL_FLASH),
        "tools": [read_pipeline_plan, update_pipeline_step, record_pipeline_decision, render_scene_stills, qa_scenes, present_qa_report],
        "middleware": [create_skills_middleware()],
    }
