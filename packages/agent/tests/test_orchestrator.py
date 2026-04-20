import pytest


def test_all_prompts_exist():
    """All prompt files must exist."""
    from pathlib import Path
    prompts_dir = Path(__file__).parent.parent / "prompts"
    required = ["orchestrator.md", "copywriter.md", "researcher.md", "director.md", "sound_engineer.md", "scene_creator.md"]
    for name in required:
        assert (prompts_dir / name).exists(), f"Missing prompt: {name}"


def test_all_skills_exist():
    """All skill files must exist."""
    from pathlib import Path
    skills_dir = Path(__file__).parent.parent / "skills"
    required = ["scene_catalog.md", "best_practices.md", "brand_guidelines.md"]
    for name in required:
        assert (skills_dir / name).exists(), f"Missing skill: {name}"


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
        create_copywriter,
        create_director,
        create_researcher,
        create_sound_engineer,
    )

    for factory in [create_researcher, create_copywriter, create_director, create_sound_engineer]:
        defn = factory()
        assert isinstance(defn, dict)
        assert "name" in defn
        assert "description" in defn
        assert "system_prompt" in defn
        assert "tools" in defn
