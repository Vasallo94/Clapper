from pathlib import Path

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def test_orchestrator_prompt_has_filesystem_section():
    content = (PROMPTS_DIR / "orchestrator.md").read_text(encoding="utf-8")
    assert "## Pipeline state (virtual filesystem)" in content
    assert "/pipeline/config.json" in content
    assert "validate_config" in content
    assert "read_file" in content
    assert "write_file" in content


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
