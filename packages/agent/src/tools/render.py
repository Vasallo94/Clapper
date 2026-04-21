import os
import time

import httpx
from langgraph.types import interrupt

RENDER_SERVICE_URL = os.environ.get("RENDER_SERVICE_URL", "http://localhost:3100")


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
    decision = interrupt(
        {
            "type": "escaleta_checkpoint",
            "brief": brief,
            "scenes": scenes,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        return "APPROVED — The user approved the escaleta. Now call submit_render immediately with the complete video config."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — The user wants changes: {feedback}. Revise the scenes and call present_escaleta again."


def submit_render(
    id: str,
    scenes: list[dict],
    title: str = "",
    description: str = "",
    fps: int = 30,
    width: int = 1080,
    height: int = 1920,
    theme: str = "linea-directa",
    composition: str = "ProductShort",
    product: str = "",
    headline: str = "",
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
        width: Video width in pixels.
        height: Video height in pixels.
        theme: Theme name (always "linea-directa" unless specified).
        composition: "ProductShort" for vertical shorts, omit for tutorials.
        product: Product name (ProductShort only).
        headline: Marketing headline (ProductShort only).

    Returns:
        Dict with "jobId" on success, or error details on failure.
    """
    config: dict = {"id": id, "fps": fps, "width": width, "height": height, "theme": theme, "scenes": scenes}
    if composition == "ProductShort":
        config["composition"] = composition
        config["product"] = product
        config["headline"] = headline
    else:
        config["title"] = title
        config["description"] = description
    response = httpx.post(f"{RENDER_SERVICE_URL}/api/render", json=config, timeout=30.0)
    return response.json()


def check_render_status(job_id: str) -> dict:
    """Check the status of a render job. Polls until terminal state (max 5 min).

    After this returns, the pipeline is COMPLETE. Do not call any other tools
    or dispatch any agents — just report the result to the user.

    Args:
        job_id: The job ID returned by submit_render.

    Returns:
        Dict with status (done/error/rendering), progress (0-100),
        and optionally output (file path) or error message.
    """
    deadline = time.time() + 300
    while time.time() < deadline:
        response = httpx.get(f"{RENDER_SERVICE_URL}/api/render/{job_id}/status", timeout=10.0)
        result = response.json()
        if result.get("status") in ("done", "error"):
            result["_pipeline_complete"] = True
            return result
        time.sleep(5)
    result["_pipeline_complete"] = True
    return result
