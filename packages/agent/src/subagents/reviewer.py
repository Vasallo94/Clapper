from ..orchestrator import MODEL_FLASH, create_model, load_prompt
from ..tools.pipeline import read_pipeline_plan, update_pipeline_step
from ..tools.validation import review_render


def create_reviewer() -> dict:
    """Create the reviewer SubAgent definition."""
    return {
        "name": "reviewer",
        "description": "Reviews rendered MP4 for correctness and presents report for approval.",
        "system_prompt": load_prompt("reviewer"),
        "model": create_model(MODEL_FLASH),
        "tools": [read_pipeline_plan, update_pipeline_step, review_render],
    }
