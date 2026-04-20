import os
from pathlib import Path

from deepagents import create_deep_agent
from langchain_google_vertexai import ChatVertexAI
from langgraph.checkpoint.memory import MemorySaver

from .tools.render import check_render_status, submit_render

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
SKILLS_DIR = Path(__file__).parent.parent / "skills"


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def create_model(name: str | None = None):
    model_name = name or os.environ.get("LLM_MODEL", "gemini-3.1-pro")
    return ChatVertexAI(
        model_name=model_name,
        project=os.environ.get("GOOGLE_CLOUD_PROJECT", "vertexlda"),
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
    )


def create_video_orchestrator():
    """Create the multi-agent video orchestrator."""
    from .tools.catalog import query_scene_catalog
    from .tools.render import present_escaleta
    from .tools.research import scrape_product, web_fetch, web_search
    from .tools.sound import generate_audio, list_audio_library, present_sound_chart

    model = create_model()
    flash_model = create_model("gemini-3.1-flash")
    checkpointer = MemorySaver()

    subagents = [
        {
            "name": "researcher",
            "description": "Searches the web for product info, documentation, and competitive data.",
            "system_prompt": load_prompt("researcher"),
            "tools": [web_search, web_fetch, scrape_product],
            "model": flash_model,
        },
        {
            "name": "copywriter",
            "description": "Generates video escaleta and config.json with human approval checkpoint.",
            "system_prompt": load_prompt("copywriter"),
            "tools": [present_escaleta, query_scene_catalog],
        },
        {
            "name": "director",
            "description": "Polishes timing, narrative beats, and audio/visual synchronization.",
            "system_prompt": load_prompt("director"),
            "tools": [],
        },
        {
            "name": "sound_engineer",
            "description": "Designs music bed and SFX with human approval checkpoint.",
            "system_prompt": load_prompt("sound_engineer"),
            "tools": [present_sound_chart, generate_audio, list_audio_library],
        },
    ]

    agent = create_deep_agent(
        model=model,
        tools=[submit_render, check_render_status],
        system_prompt=load_prompt("orchestrator"),
        checkpointer=checkpointer,
        subagents=subagents,
        skills=[str(SKILLS_DIR)],
    )

    return agent
