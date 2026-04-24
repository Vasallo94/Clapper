from ._checkpoint import checkpoint_interrupt


def present_custom_scene(component_id: str, code: str) -> str:
    """Present a custom scene component for human review.

    Shows the generated React code to the user for approval before
    integrating it into the Remotion bundle.

    Args:
        component_id: Kebab-case component identifier (e.g. 'data-table').
        code: Full TypeScript/React source code for the component.
    """
    return checkpoint_interrupt(
        {"type": "custom_scene_checkpoint", "component_id": component_id, "code": code},
        "The user approved the custom scene. Proceed with registration and validation.",
        "Revise the component code and call present_custom_scene again.",
    )
