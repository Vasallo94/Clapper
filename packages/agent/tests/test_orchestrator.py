import pytest


def test_all_prompts_exist():
    """All prompt files must exist."""
    from pathlib import Path
    prompts_dir = Path(__file__).parent.parent / "prompts"
    required = [
        "orchestrator.md",
        "copywriter.md",
        "researcher.md",
        "director.md",
        "sound_engineer.md",
        "scene_creator.md",
        "audio_planner.md",
        "voice_generator.md",
        "validator.md",
        "reviewer.md",
    ]
    for name in required:
        assert (prompts_dir / name).exists(), f"Missing prompt: {name}"


def test_all_skills_exist():
    """All skill directories must have SKILL.md."""
    from pathlib import Path
    skills_dir = Path(__file__).parent.parent / "skills"
    required = [
        "scene-catalog",
        "video-best-practices",
        "brand-guidelines",
        "remotion-best-practices",
        "remotion-director",
        "remotion-tutorial-generator",
        "remotion-short-ld",
        "sound-engineer",
    ]
    for name in required:
        skill_file = skills_dir / name / "SKILL.md"
        assert skill_file.exists(), f"Missing skill: {name}/SKILL.md"


def test_skills_have_valid_frontmatter():
    """All SKILL.md files must have name and description in frontmatter."""
    from pathlib import Path
    import re
    skills_dir = Path(__file__).parent.parent / "skills"
    for skill_dir in skills_dir.iterdir():
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
        content = skill_file.read_text(encoding="utf-8")
        assert content.startswith("---"), f"{skill_dir.name}/SKILL.md missing frontmatter"
        fm_end = content.index("---", 3)
        frontmatter = content[3:fm_end]
        assert "name:" in frontmatter, f"{skill_dir.name}/SKILL.md missing 'name' field"
        assert "description:" in frontmatter, f"{skill_dir.name}/SKILL.md missing 'description' field"


def test_subagents_with_skills_have_skills_middleware():
    """Subagents that need domain knowledge must have a SkillsMiddleware in 'middleware'."""
    from deepagents.middleware.skills import SkillsMiddleware
    from src.subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_sound_engineer,
        create_validator,
    )

    for factory in [create_copywriter, create_director, create_audio_planner, create_sound_engineer, create_validator]:
        defn = factory()
        middleware = defn.get("middleware", [])
        has_skills = any(isinstance(mw, SkillsMiddleware) for mw in middleware)
        assert has_skills, f"{factory.__name__} missing SkillsMiddleware in 'middleware'"


def test_subagents_have_pipeline_plan_tools():
    """Subagents must be able to inspect/update the shared pipeline plan."""
    from src.subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_researcher,
        create_reviewer,
        create_scene_creator,
        create_scene_qa,
        create_sound_engineer,
        create_validator,
        create_voice_generator,
    )

    factories = [
        create_researcher,
        create_copywriter,
        create_director,
        create_scene_qa,
        create_audio_planner,
        create_voice_generator,
        create_sound_engineer,
        create_scene_creator,
        create_validator,
        create_reviewer,
    ]
    for factory in factories:
        tool_names = {getattr(tool, "__name__", "") for tool in factory()["tools"]}
        assert "read_pipeline_plan" in tool_names, f"{factory.__name__} missing read_pipeline_plan"
        assert "update_pipeline_step" in tool_names, f"{factory.__name__} missing update_pipeline_step"


def test_checkpoint_subagents_have_decision_tool():
    """Subagents with checkpoint interrupts must have record_pipeline_decision."""
    from src.subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_scene_creator,
        create_scene_qa,
    )

    checkpoint_factories = [
        create_copywriter,
        create_director,
        create_audio_planner,
        create_scene_qa,
        create_scene_creator,
    ]
    for factory in checkpoint_factories:
        tool_names = {getattr(tool, "__name__", "") for tool in factory()["tools"]}
        assert "record_pipeline_decision" in tool_names, f"{factory.__name__} missing record_pipeline_decision"


def test_skills_middleware_uses_readable_virtual_paths():
    """Skills must load metadata and expose SKILL.md paths readable by agent file tools."""
    from src.orchestrator import create_agent_backend, create_skills_middleware

    backend = create_agent_backend()
    middleware = create_skills_middleware(backend)
    update = middleware.before_agent({}, None, {})

    skills = update["skills_metadata"]
    assert len(skills) == 11
    assert all(skill["path"].startswith("/skills/") for skill in skills)

    first_skill_path = skills[0]["path"]
    read_result = backend.read(first_skill_path, limit=5)
    assert read_result.error is None
    assert read_result.file_data is not None
    assert "name:" in read_result.file_data["content"]


def test_load_prompt():
    """load_prompt should return the content of a prompt file."""
    from src.orchestrator import load_prompt
    content = load_prompt("orchestrator")
    assert "Video Platform Orchestrator" in content
    assert len(content) > 100


def test_create_model():
    """create_model should return a ChatVertexAI instance."""
    from src.orchestrator import create_model
    model = create_model()
    assert model is not None


def test_subagent_factories_all_return_dicts():
    """All subagent factory functions should return dicts with required keys."""
    from src.subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_researcher,
        create_reviewer,
        create_scene_creator,
        create_sound_engineer,
        create_validator,
        create_voice_generator,
    )

    factories = [
        create_researcher,
        create_copywriter,
        create_director,
        create_audio_planner,
        create_voice_generator,
        create_sound_engineer,
        create_scene_creator,
        create_validator,
        create_reviewer,
    ]
    for factory in factories:
        defn = factory()
        assert isinstance(defn, dict), f"{factory.__name__} did not return a dict"
        assert "name" in defn
        assert "description" in defn
        assert "system_prompt" in defn
        assert "tools" in defn


def test_orchestrator_registers_scene_creator():
    """The orchestrator must include scene_creator in the real subagent list."""
    import inspect
    from src.orchestrator import create_video_orchestrator

    source = inspect.getsource(create_video_orchestrator)
    assert "create_scene_creator" in source
    assert "create_scene_creator()" in source


def test_orchestrator_registers_mode_router_tools():
    """The orchestrator must expose deterministic mode routing and config tools."""
    import inspect
    from src.orchestrator import create_video_orchestrator

    source = inspect.getsource(create_video_orchestrator)
    for name in [
        "route_intent",
        "get_mode_contract",
        "ask_user_interaction",
        "create_pipeline_plan",
        "read_pipeline_plan",
        "update_pipeline_step",
        "record_pipeline_decision",
        "get_next_pipeline_step",
        "list_video_configs",
        "stage_existing_config",
        "present_revision_plan",
        "present_variant_plan",
        "present_target_selection",
    ]:
        assert name in source


class TestOrchestratorContextSchema:
    def test_orchestrator_has_context_schema(self, monkeypatch):
        monkeypatch.setenv("GOOGLE_API_KEY", "fake-key")
        from src.orchestrator import create_video_orchestrator
        from src.context import PipelineContext
        from langgraph.checkpoint.memory import MemorySaver

        graph = create_video_orchestrator(checkpointer=MemorySaver())
        assert graph.config_schema is not None

    def test_pipeline_context_is_importable_from_orchestrator(self):
        from src.context import PipelineContext
        from dataclasses import is_dataclass

        assert is_dataclass(PipelineContext)
