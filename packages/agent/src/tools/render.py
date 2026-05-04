import logging
import os
import time
from typing import Annotated, Any

import httpx
from langchain_core.tools import InjectedToolArg

from ._checkpoint import checkpoint_interrupt

logger = logging.getLogger(__name__)

RENDER_SERVICE_URL = os.environ.get("RENDER_SERVICE_URL", "http://localhost:3100")
RENDER_TIMEOUT_SECONDS = int(os.environ.get("RENDER_TIMEOUT_SECONDS", "300"))

if RENDER_SERVICE_URL == "http://localhost:3100":
    logger.warning("RENDER_SERVICE_URL not set, using default localhost:3100")


def present_escaleta(scenes: list[dict], brief: dict) -> str:
    """Present a video escaleta (scene breakdown) to the user for approval.

    Call this after generating a scene list. Pauses execution and waits for the
    user to approve, request changes, or reject.

    IMPORTANT: When the return value contains "approved": true, you MUST immediately
    call submit_render with the approved scenes. Do NOT call present_escaleta again.

    Args:
        scenes: List of scene dicts matching the Remotion config schema.
        brief: Dict with keys: platform, audience, goal, promise, tone, cta, hookStrategy.

    Returns:
        A string describing the user's decision. If approved, call submit_render next.
        If not approved, revise the scenes based on feedback and call present_escaleta again.
    """
    return checkpoint_interrupt(
        {"type": "escaleta_checkpoint", "brief": brief, "scenes": scenes},
        "The user approved the escaleta. Now call submit_render immediately with the complete video config.",
        "Revise the scenes and call present_escaleta again.",
    )


def present_direction(scenes: list[dict], warnings: list[str]) -> str:
    """Present the director's timing and beats for approval.

    Shows the user the timing (leadInMs, audioStartMs, tailHoldMs, transitionMs)
    and beats added to each scene by the director agent.

    Args:
        scenes: List of scene dicts with timing and beats fields added.
        warnings: List of director warnings about potential issues.
    """
    return checkpoint_interrupt(
        {"type": "direction_checkpoint", "scenes": scenes, "warnings": warnings},
        "The user approved the direction. Proceed to audio planning.",
        "Revise timing/beats and call present_direction again.",
    )


def submit_render(
    id: str,
    scenes: list[dict],
    title: str = "",
    description: str = "",
    fps: int = 30,
    width: int = 0,
    height: int = 0,
    theme: str = "linea-directa",
    composition: str = "",
    product: str = "",
    headline: str = "",
    voiceover: dict | None = None,
    sound_design: dict | None = None,
    runtime: Annotated[Any, InjectedToolArg] = None,
) -> dict:
    """Submit a complete video config for rendering.

    The render service validates the config against Zod schemas before starting.
    Returns a job ID for tracking, or error details if validation fails.

    Args:
        id: Kebab-case video identifier.
        scenes: List of scene dicts with type, durationInSeconds, and scene-specific fields.
        title: Video title (required for tutorials).
        description: One-line description (required for tutorials).
        fps: Frames per second (always 30).
        width: Video width in pixels (0 = resolve from runtime or default 1280).
        height: Video height in pixels (0 = resolve from runtime or default 720).
        theme: Theme name (always "linea-directa" unless specified).
        composition: "ProductShort" for vertical shorts, empty string for tutorials (default).
        product: Product name (ProductShort only).
        headline: Marketing headline (ProductShort only).
        voiceover: Voiceover config from audio_planner (provider, voiceId, scenes).
        sound_design: Sound design config from audio_planner (musicBed, sfx).
        runtime: Optional ToolRuntime injected by DeepAgents. Provides context with
            render_service_url, width, and height overrides.

    Returns:
        Dict with "jobId" on success, or error details on failure.
    """
    ctx = getattr(runtime, "context", None) if runtime else None
    render_url = (ctx.render_service_url if ctx else None) or RENDER_SERVICE_URL
    effective_width = width or (ctx.width if ctx else 1280) or 1280
    effective_height = height or (ctx.height if ctx else 720) or 720

    config: dict = {
        "id": id,
        "fps": fps,
        "width": effective_width,
        "height": effective_height,
        "theme": theme,
        "scenes": scenes,
    }
    if voiceover is not None:
        config["voiceover"] = voiceover
    if sound_design is not None:
        config["soundDesign"] = sound_design
    if voiceover is None and sound_design is None:
        config["_skipAudioGeneration"] = True
    if composition == "ProductShort":
        config["composition"] = composition
        config["product"] = product
        config["headline"] = headline
    else:
        config["title"] = title
        config["description"] = description
    response = httpx.post(f"{render_url}/api/render", json=config, timeout=30.0)
    return response.json()


def check_render_status(job_id: str, runtime: Annotated[Any, InjectedToolArg] = None) -> dict:
    """Check the status of a render job. Polls until terminal state (max 5 min).

    After this returns, the pipeline is COMPLETE. Do not call any other tools
    or dispatch any agents — just report the result to the user.

    Args:
        job_id: The job ID returned by submit_render.
        runtime: Optional ToolRuntime injected by DeepAgents. Provides context with
            render_service_url override.

    Returns:
        Dict with status (done/error/rendering), progress (0-100),
        and optionally output_path (file path) or error (detailed message
        including stderr from the render process).
    """
    ctx = getattr(runtime, "context", None) if runtime else None
    render_url = (ctx.render_service_url if ctx else None) or RENDER_SERVICE_URL
    deadline = time.time() + RENDER_TIMEOUT_SECONDS
    result: dict = {"status": "timeout", "progress": 0, "_pipeline_complete": True}
    while time.time() < deadline:
        response = httpx.get(f"{render_url}/api/render/{job_id}/status", timeout=10.0)
        result = response.json()
        if result.get("status") in ("done", "error"):
            result["_pipeline_complete"] = True
            if result.get("status") == "error":
                logger.error("Render failed for job %s: %s", job_id, result.get("error", "unknown"))
            return result
        time.sleep(5)
    result["_pipeline_complete"] = True
    return result
