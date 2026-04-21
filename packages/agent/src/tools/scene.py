from langgraph.types import interrupt


def present_custom_scene(component_id: str, code: str) -> str:
    """Present a custom scene component for human review.

    Shows the generated React code to the user for approval before
    integrating it into the Remotion bundle.

    Args:
        component_id: Kebab-case component identifier (e.g. 'data-table').
        code: Full TypeScript/React source code for the component.
    """
    decision = interrupt(
        {
            "type": "custom_scene_checkpoint",
            "component_id": component_id,
            "code": code,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        return "APPROVED — The user approved the custom scene. Proceed with registration and validation."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — {feedback}. Revise the component code and call present_custom_scene again."
