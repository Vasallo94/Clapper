from ..orchestrator import load_prompt


def create_director() -> dict:
    """Create the director SubAgent definition."""
    return {
        "name": "director",
        "description": "Polishes timing, narrative beats, and audio/visual synchronization.",
        "system_prompt": load_prompt("director"),
        "tools": [],
    }
