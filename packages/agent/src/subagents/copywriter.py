from ..orchestrator import SKILLS_DIR, load_prompt
from ..tools.catalog import query_scene_catalog
from ..tools.render import present_escaleta
from ..tools.validation import audit_content_quality


def create_copywriter() -> dict:
    """Create the copywriter SubAgent definition."""
    return {
        "name": "copywriter",
        "description": "Generates video escaleta and config.json with human approval checkpoint.",
        "system_prompt": load_prompt("copywriter"),
        "tools": [present_escaleta, query_scene_catalog, audit_content_quality],
        "skills": [str(SKILLS_DIR)],
    }
