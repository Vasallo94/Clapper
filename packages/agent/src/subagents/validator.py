from ..orchestrator import create_skills_middleware, load_prompt
from ..tools.pipeline import read_pipeline_plan, update_pipeline_step
from ..tools.validation import audit_content_quality, validate_config


def create_validator() -> dict:
    """Create the validator SubAgent definition."""
    return {
        "name": "validator",
        "description": "Validates config coherence against assets on disk before rendering.",
        "system_prompt": load_prompt("validator"),
        "tools": [read_pipeline_plan, update_pipeline_step, validate_config, audit_content_quality],
        "middleware": [create_skills_middleware()],
    }
