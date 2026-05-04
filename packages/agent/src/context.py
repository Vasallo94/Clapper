import os
from dataclasses import dataclass, field
from pathlib import Path

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
