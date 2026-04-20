import os

import httpx
from langgraph.types import interrupt

RENDER_SERVICE_URL = os.environ.get("RENDER_SERVICE_URL", "http://localhost:3100")


def present_escaleta(scenes: list[dict], brief: dict) -> dict:
    """Present a video escaleta (scene breakdown) to the user for approval.

    Call this after generating a scene list. Pauses execution and waits for the
    user to approve, request changes, or reject. Returns the user's decision.

    Args:
        scenes: List of scene dicts matching the Remotion config schema.
        brief: Dict with keys: platform, audience, goal, promise, tone, cta, hookStrategy.

    Returns:
        Dict with the user's decision, e.g. {"approved": True} or
        {"approved": False, "feedback": "Make the intro shorter"}.
    """
    decision = interrupt(
        {
            "type": "escaleta_checkpoint",
            "brief": brief,
            "scenes": scenes,
        }
    )
    return decision


def submit_render(config: dict) -> dict:
    """Submit a complete video config for rendering.

    The render service validates the config against Zod schemas before starting.
    Returns a job ID for tracking, or error details if validation fails.

    Args:
        config: Complete video config dict (id, title, fps, scenes, etc.).

    Returns:
        Dict with "jobId" on success, or error details on failure.
    """
    response = httpx.post(f"{RENDER_SERVICE_URL}/api/render", json=config, timeout=30.0)
    return response.json()


def check_render_status(job_id: str) -> dict:
    """Check the status of a render job.

    Args:
        job_id: The job ID returned by submit_render.

    Returns:
        Dict with status (validating/rendering/done/error), progress (0-100),
        and optionally output (file path) or error message.
    """
    response = httpx.get(f"{RENDER_SERVICE_URL}/api/render/{job_id}/status", timeout=10.0)
    return response.json()
