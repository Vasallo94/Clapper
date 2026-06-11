from ..orchestrator import MODEL_PRO, create_model, create_skills_middleware, load_prompt
from ..tools.backlog import list_friction_drafts, mark_draft_addressed, read_friction_draft
from ..tools.friction import report_friction
from ..tools.interactions import ask_user_interaction
from ..tools.render import check_render_status, submit_render
from ..tools.workspace import (
    commit_and_push,
    list_workspace_files,
    open_pull_request,
    prepare_workspace,
    read_workspace_file,
    write_workspace_file,
)


def create_improver() -> dict:
    """Create the Improver SubAgent definition (self_improve mode)."""
    return {
        "name": "improver",
        "description": (
            "Reviews the AFP friction backlog, proposes an improvement plan for "
            "human approval, edits Claqueta's creative code (custom scenes, agent "
            "skills/prompts, content configs) in an isolated git workspace, and "
            "opens GitHub PRs for human review."
        ),
        "system_prompt": load_prompt("improver"),
        "model": create_model(MODEL_PRO),
        "tools": [
            list_friction_drafts,
            read_friction_draft,
            mark_draft_addressed,
            prepare_workspace,
            read_workspace_file,
            list_workspace_files,
            write_workspace_file,
            commit_and_push,
            open_pull_request,
            submit_render,
            check_render_status,
            ask_user_interaction,
            report_friction,
        ],
        "middleware": [create_skills_middleware()],
    }
