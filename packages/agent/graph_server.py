"""Entry point for langgraph dev server."""

import logging
import os
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", message=".*files_update.*deprecated.*deepagents.*")

from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("claqueta")

_ROOT = Path(os.environ.get("PROJECT_ROOT", str(Path(__file__).resolve().parent.parent.parent)))
load_dotenv(_ROOT / ".env")

_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if _creds and not Path(_creds).is_absolute():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(_ROOT / _creds)

import deepagents.middleware.filesystem as _fs_mod  # noqa: E402
_fs_mod.DEFAULT_READ_LIMIT = 2000
# Also patch the schema class default so the LLM sees the higher limit
_fs_mod.ReadFileSchema.model_fields["limit"].default = 2000

from src.agent import create_video_agent  # noqa: E402

graph = create_video_agent()

logger.info("Video agent graph loaded. Nodes: %s", list(graph.get_graph().nodes) if hasattr(graph, "get_graph") else "N/A")
