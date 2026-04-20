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
    from .subagents import (
        create_copywriter,
        create_director,
        create_researcher,
        create_sound_engineer,
    )

    model = create_model()
    checkpointer = MemorySaver()

    subagents = [
        create_researcher(),
        create_copywriter(),
        create_director(),
        create_sound_engineer(),
    ]

    # TODO: Add scene_creator when CompiledSubAgent integration is verified
    # scene_creator = create_scene_creator()

    agent = create_deep_agent(
        model=model,
        tools=[submit_render, check_render_status],
        system_prompt=load_prompt("orchestrator"),
        checkpointer=checkpointer,
        subagents=subagents,
        skills=[str(SKILLS_DIR)],
    )

    return agent
