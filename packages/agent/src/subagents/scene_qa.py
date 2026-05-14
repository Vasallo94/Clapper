from ..orchestrator import SKILLS_DIR, load_prompt
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
        "tools": [render_scene_stills, qa_scenes, present_qa_report],
        "skills": [str(SKILLS_DIR)],
    }
