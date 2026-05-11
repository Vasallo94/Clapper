from ..orchestrator import SKILLS_DIR, load_prompt
from ..tools.validation import audit_content_quality, validate_config


def create_validator() -> dict:
    """Create the validator SubAgent definition."""
    return {
        "name": "validator",
        "description": "Validates config coherence against assets on disk before rendering.",
        "system_prompt": load_prompt("validator"),
        "tools": [validate_config, audit_content_quality],
        "skills": [str(SKILLS_DIR)],
    }
