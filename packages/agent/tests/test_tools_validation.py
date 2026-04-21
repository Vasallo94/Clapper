import json

import pytest


class TestValidateConfig:
    def test_valid_config_all_assets_exist(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        config_id = "test-video"
        config = {
            "id": config_id,
            "scenes": [
                {"type": "intro", "durationInSeconds": 3},
                {"type": "terminal", "durationInSeconds": 10},
            ],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        registry_dir = tmp_path / "src" / "compositions" / "ClaudeCodeTutorial"
        registry_dir.mkdir(parents=True)
        registry_file = registry_dir / "customSceneRegistry.ts"
        registry_file.write_text('export const customSceneRegistry = {}')

        from src.tools.validation import validate_config

        result = validate_config(str(config_path))
        parsed = json.loads(result)
        assert parsed["errors"] == []

    def test_missing_voiceover_files(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        config = {
            "id": "test-video",
            "voiceover": {
                "enabled": True,
                "provider": "gemini",
                "voiceId": "Orus",
                "scenes": {"0": "Hello world", "1": "Goodbye world"},
            },
            "scenes": [
                {"type": "intro", "durationInSeconds": 3},
                {"type": "outro", "durationInSeconds": 3},
            ],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        registry_dir = tmp_path / "src" / "compositions" / "ClaudeCodeTutorial"
        registry_dir.mkdir(parents=True)
        (registry_dir / "customSceneRegistry.ts").write_text('export const customSceneRegistry = {}')

        from src.tools.validation import validate_config

        result = validate_config(str(config_path))
        parsed = json.loads(result)
        assert len(parsed["errors"]) > 0
        assert any("voiceover" in e.lower() or "mp3" in e.lower() for e in parsed["errors"])

    def test_missing_library_track(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        config = {
            "id": "test-video",
            "soundDesign": {
                "enabled": True,
                "musicBed": {"libraryId": "nonexistent-track"},
                "sfx": [],
            },
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)

        registry_dir = tmp_path / "src" / "compositions" / "ClaudeCodeTutorial"
        registry_dir.mkdir(parents=True)
        (registry_dir / "customSceneRegistry.ts").write_text('export const customSceneRegistry = {}')

        from src.tools.validation import validate_config

        result = validate_config(str(config_path))
        parsed = json.loads(result)
        assert any("nonexistent-track" in e for e in parsed["errors"])

    def test_unknown_custom_scene_type(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        config = {
            "id": "test-video",
            "scenes": [
                {"type": "custom", "componentId": "not-registered", "durationInSeconds": 5},
            ],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        registry_dir = tmp_path / "src" / "compositions" / "ClaudeCodeTutorial"
        registry_dir.mkdir(parents=True)
        (registry_dir / "customSceneRegistry.ts").write_text(
            'export const customSceneRegistry = { "block-diagram": BlockDiagramScene }'
        )

        from src.tools.validation import validate_config

        result = validate_config(str(config_path))
        parsed = json.loads(result)
        assert any("not-registered" in e for e in parsed["errors"])


class TestReviewRender:
    def test_review_render_success(self, tmp_path, monkeypatch):
        import subprocess as sp
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)

        output_path = tmp_path / "output.mp4"
        output_path.write_bytes(b"\x00" * 1024)

        config = {
            "id": "test",
            "fps": 30,
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps(config))

        def fake_run(cmd, **kwargs):
            stdout = json.dumps({
                "format": {"duration": "3.000000"},
                "streams": [{"codec_type": "video"}, {"codec_type": "audio"}],
            })
            return sp.CompletedProcess(args=cmd, returncode=0, stdout=stdout, stderr="")

        monkeypatch.setattr(sp, "run", fake_run)

        from src.tools.validation import review_render

        result = review_render(str(output_path), str(config_path))
        parsed = json.loads(result)
        assert parsed["mp4_exists"] is True
        assert parsed["has_audio"] is True
        assert parsed["duration_match"] is True

    def test_review_render_missing_file(self, tmp_path):
        import json as json_mod
        from src.tools.validation import review_render

        config = {"id": "test", "fps": 30, "scenes": [{"type": "intro", "durationInSeconds": 3}]}
        config_path = tmp_path / "config.json"
        config_path.write_text(json_mod.dumps(config))

        result = review_render(str(tmp_path / "missing.mp4"), str(config_path))
        parsed = json_mod.loads(result)
        assert parsed["mp4_exists"] is False
