from ..orchestrator import create_model, load_prompt
from ..tools.research import scrape_product, web_fetch, web_search


def create_researcher() -> dict:
    """Create the researcher SubAgent definition."""
    return {
        "name": "researcher",
        "description": "Searches the web for product info, documentation, and competitive data.",
        "system_prompt": load_prompt("researcher"),
        "tools": [web_search, web_fetch, scrape_product],
        "model": create_model(),
    }
