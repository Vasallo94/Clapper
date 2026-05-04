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
