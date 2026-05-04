import os
from pathlib import Path

from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver  # used when running standalone

from .tools.render import check_render_status, submit_render

from .config import PROJECT_ROOT
from .context import PipelineContext

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
SKILLS_DIR = Path(__file__).parent.parent / "skills"

DEFAULT_MODEL = "gemini-3.1-pro-preview"

DISABLE_WRITE_TODOS = os.environ.get("DISABLE_WRITE_TODOS", "").lower() in ("1", "true", "yes")


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


def create_video_orchestrator(*, checkpointer=None):
    """Create the multi-agent video orchestrator with 3 subgraphs."""
    from .subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_researcher,
        create_reviewer,
        create_sound_engineer,
        create_validator,
        create_voice_generator,
    )

    model = create_model()

    backend = CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: ("video-orchestrator",),
            ),
        },
    )

    subagents = [
        create_researcher(),
        create_copywriter(),
        create_director(),
        create_audio_planner(),
        create_voice_generator(),
        create_sound_engineer(),
        create_validator(),
        create_reviewer(),
    ]

    system_prompt = load_prompt("orchestrator")
    if DISABLE_WRITE_TODOS:
        system_prompt += "\n\nDo NOT use write_todos tool. Plan using text responses only."

    middleware = []
    try:
        from deepagents.middleware.summarization import create_summarization_tool_middleware
        middleware.append(create_summarization_tool_middleware(model, StateBackend))
    except ImportError:
        pass

    kwargs: dict = {
        "model": model,
        "tools": [submit_render, check_render_status],
        "system_prompt": system_prompt,
        "subagents": subagents,
        "skills": [str(SKILLS_DIR)],
        "backend": backend,
        "memory": ["/memories/AGENTS.md"],
        "name": "video-orchestrator",
        "context_schema": PipelineContext,
    }
    if middleware:
        kwargs["middleware"] = middleware
    if checkpointer is not None:
        kwargs["checkpointer"] = checkpointer

    return create_deep_agent(**kwargs)
