from ..orchestrator import load_prompt
from ..tools.validation import review_render


def create_reviewer() -> dict:
    """Create the reviewer SubAgent definition."""
    return {
        "name": "reviewer",
        "description": "Reviews rendered MP4 for correctness and presents report for approval.",
        "system_prompt": load_prompt("reviewer"),
        "tools": [review_render],
    }
