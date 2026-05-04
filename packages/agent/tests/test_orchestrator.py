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


def test_subagents_with_skills_have_skills_key():
    """Subagents that need domain knowledge must have a skills key."""
    from src.subagents import (
        create_audio_planner,
        create_copywriter,
        create_director,
        create_sound_engineer,
        create_validator,
    )

    for factory in [create_copywriter, create_director, create_audio_planner, create_sound_engineer, create_validator]:
        defn = factory()
        assert "skills" in defn, f"{factory.__name__} missing 'skills' key"
        assert len(defn["skills"]) > 0, f"{factory.__name__} has empty skills list"


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
