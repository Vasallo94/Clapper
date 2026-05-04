from ..orchestrator import SKILLS_DIR, load_prompt
from ..tools.render import present_direction


def create_director() -> dict:
    """Create the director SubAgent definition."""
    return {
        "name": "director",
        "description": "Polishes timing, narrative beats, and audio/visual synchronization with human approval.",
        "system_prompt": load_prompt("director"),
        "tools": [present_direction],
        "skills": [str(SKILLS_DIR)],
    }
