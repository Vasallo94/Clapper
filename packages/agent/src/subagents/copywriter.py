from ..orchestrator import MODEL_PRO, create_model, create_skills_middleware, load_prompt
from ..tools.catalog import query_scene_catalog
from ..tools.pipeline import read_pipeline_plan, record_pipeline_decision, update_pipeline_step
from ..tools.render import present_escaleta
from ..tools.validation import audit_content_quality


def create_copywriter() -> dict:
    """Create the copywriter SubAgent definition."""
    return {
        "name": "copywriter",
        "description": "Generates video escaleta and config.json with human approval checkpoint.",
        "system_prompt": load_prompt("copywriter"),
        "model": create_model(MODEL_PRO),
        "tools": [read_pipeline_plan, update_pipeline_step, record_pipeline_decision, present_escaleta, query_scene_catalog, audit_content_quality],
        "middleware": [create_skills_middleware()],
    }
