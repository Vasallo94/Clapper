from langgraph.graph import END, StateGraph

from .nodes import (
    SceneCreatorState,
    init_node,
    lint_node,
    register_node,
    should_retry,
    validate_node,
)


def create_scene_creator_graph():
    """Create the Scene Creator validation graph."""
    builder = StateGraph(SceneCreatorState)

    builder.add_node("init", init_node)
    builder.add_node("lint", lint_node)
    builder.add_node("register", register_node)
    builder.add_node("validate", validate_node)

    builder.set_entry_point("init")
    builder.add_edge("init", "lint")
    builder.add_edge("lint", "register")
    builder.add_edge("register", "validate")
    builder.add_conditional_edges(
        "validate",
        should_retry,
        {
            "done": END,
            "retry": "lint",
            "error": END,
        },
    )

    return builder.compile()


def create_scene_creator():
    """Create scene creator as a subagent-compatible object.

    Returns a dict with the graph and metadata that can be used
    by the orchestrator. The exact integration depends on the
    DeepAgents CompiledSubAgent API.
    """
    from ...orchestrator import SKILLS_DIR, create_model, load_prompt
    from ...tools.scene import present_custom_scene
    from .tools import read_scene, write_scene

    graph = create_scene_creator_graph()

    return {
        "name": "scene_creator",
        "description": "Creates new custom Remotion scene components. Validates via lint + bundle compilation.",
        "graph": graph,
        "system_prompt": load_prompt("scene_creator"),
        "tools": [write_scene, read_scene, present_custom_scene],
        "skills": [str(SKILLS_DIR)],
        "model": create_model(),
    }
