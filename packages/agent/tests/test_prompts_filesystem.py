from pathlib import Path

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

PLAN_PROMPTS = {
    "researcher.md": "research",
    "copywriter.md": "copywriting",
    "director.md": "direction",
    "scene_qa.md": "scene_qa",
    "audio_planner.md": "audio_plan",
    "voice_generator.md": "voice_generation",
    "sound_engineer.md": "sound_assets",
    "scene_creator.md": "scene_creation",
    "validator.md": "final_validation",
    "reviewer.md": "review",
}


def test_orchestrator_prompt_has_filesystem_section():
    content = (PROMPTS_DIR / "orchestrator.md").read_text(encoding="utf-8")
    assert "## Pipeline state (virtual filesystem)" in content
    assert "/pipeline/config.json" in content
    assert "validate_config" in content
    assert "read_file" in content
    assert "write_file" in content


def test_subagent_prompts_have_shared_plan_discipline():
    for prompt_name, step_id in PLAN_PROMPTS.items():
        content = (PROMPTS_DIR / prompt_name).read_text(encoding="utf-8")
        assert "## Shared plan discipline" in content, f"{prompt_name} missing shared plan section"
        assert "read_pipeline_plan" in content, f"{prompt_name} must read pipeline plan"
        assert "update_pipeline_step" in content, f"{prompt_name} must update pipeline step"
        assert step_id in content, f"{prompt_name} must mention assigned step {step_id}"
        assert "/pipeline/plan.json" in content, f"{prompt_name} must reference /pipeline/plan.json"


CHECKPOINT_PROMPTS = {
    "copywriter.md": "CP1",
    "director.md": "CP2",
    "audio_planner.md": "CP3",
    "scene_qa.md": "CP-QA",
    "scene_creator.md": "CP4",
}


def test_checkpoint_prompts_record_decisions():
    for prompt_name, cp_id in CHECKPOINT_PROMPTS.items():
        content = (PROMPTS_DIR / prompt_name).read_text(encoding="utf-8")
        assert "record_pipeline_decision" in content, f"{prompt_name} must call record_pipeline_decision"
        assert cp_id in content, f"{prompt_name} must reference checkpoint {cp_id}"


class TestCreativePromptsFilesystem:
    def test_researcher_writes_brief(self):
        content = (PROMPTS_DIR / "researcher.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/brief.json" in content
        assert "write_file" in content

    def test_copywriter_reads_brief_writes_config(self):
        content = (PROMPTS_DIR / "copywriter.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/brief.json" in content
        assert "/pipeline/config.json" in content

    def test_director_reads_writes_config(self):
        content = (PROMPTS_DIR / "director.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content


class TestProductionPromptsFilesystem:
    def test_audio_planner_reads_writes_config(self):
        content = (PROMPTS_DIR / "audio_planner.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content

    def test_voice_generator_reads_config(self):
        content = (PROMPTS_DIR / "voice_generator.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content

    def test_sound_engineer_reads_config(self):
        content = (PROMPTS_DIR / "sound_engineer.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content


class TestDeliveryPromptsFilesystem:
    def test_validator_reads_config(self):
        content = (PROMPTS_DIR / "validator.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content

    def test_reviewer_reads_config(self):
        content = (PROMPTS_DIR / "reviewer.md").read_text(encoding="utf-8")
        assert "## State management" in content
        assert "/pipeline/config.json" in content
