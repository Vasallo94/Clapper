import os
from pathlib import Path

from deepagents import create_deep_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver

from .tools.render import check_render_status, submit_render

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
SKILLS_DIR = Path(__file__).parent.parent / "skills"

DEFAULT_MODEL = "gemini-3.1-pro-preview"


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def _load_vertex_credentials():
    """Load Vertex AI credentials from service account file."""
    from google.oauth2 import service_account

    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        return None
    path = Path(creds_path)
    if not path.is_file():
        return None
    return service_account.Credentials.from_service_account_file(
        str(path),
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )


def create_model(name: str | None = None):
    model_name = name or os.environ.get("LLM_MODEL", DEFAULT_MODEL)
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if api_key:
        return ChatGoogleGenerativeAI(model=model_name, api_key=api_key)
    credentials = _load_vertex_credentials()
    return ChatGoogleGenerativeAI(
        model=model_name,
        credentials=credentials,
        project=os.environ.get("GOOGLE_CLOUD_PROJECT", "vertexlda"),
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
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
