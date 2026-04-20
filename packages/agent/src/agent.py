import os
from pathlib import Path

from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver

from .tools import check_render_status, present_escaleta, submit_render

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def create_video_agent():
    """Create the DeepAgents video generation agent."""
    model = os.environ.get("LLM_MODEL", "google_vertexai:gemini-2.5-pro")
    checkpointer = MemorySaver()

    agent = create_deep_agent(
        model=model,
        tools=[present_escaleta, submit_render, check_render_status],
        system_prompt=load_prompt("copywriter"),
        checkpointer=checkpointer,
    )

    return agent
