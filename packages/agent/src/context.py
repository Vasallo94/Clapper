import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)


@dataclass
class PipelineContext:
    config_id: str
    composition: str = ""
    width: int = 1280
    height: int = 720
    theme: str = "linea-directa"
    output_dir: str = field(default_factory=lambda: os.environ.get("PROJECT_ROOT", _PROJECT_ROOT))
    render_service_url: str = field(
        default_factory=lambda: os.environ.get("RENDER_SERVICE_URL", "http://localhost:3100")
    )


def get_pipeline_context(runtime: Any) -> "PipelineContext | None":
    return getattr(runtime, "context", None) if runtime else None


def resolve_config_id(runtime: Any, config: dict) -> str:
    ctx = get_pipeline_context(runtime)
    return (ctx.config_id if ctx else None) or config.get("id", "unknown")
