"""Entry point for langgraph dev server."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("video-agent")

_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_ROOT / ".env")

_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if _creds and not Path(_creds).is_absolute():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(_ROOT / _creds)

from src.agent import create_video_agent  # noqa: E402

graph = create_video_agent()

logger.info("Video agent graph loaded. Nodes: %s", list(graph.get_graph().nodes) if hasattr(graph, "get_graph") else "N/A")
