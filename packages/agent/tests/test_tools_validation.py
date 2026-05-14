import json

import pytest


class TestValidateConfig:
    def test_includes_remotion_schema_errors(self, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "_run_remotion_schema_validation", lambda config: (["Schema title: Required"], []))

        from src.tools.validation import validate_config

        config = {
            "id": "test-video",
            "title": "Test",
            "description": "Test",
            "fps": 30,
            "width": 1280,
            "height": 720,
            "theme": "linea-directa",
            "transition": None,
            "scenes": [
                {"type": "intro", "title": "Hello", "durationInSeconds": 3},
                {"type": "outro", "title": "Bye", "durationInSeconds": 3},
            ],
        }

        result = validate_config(json.dumps(config))
        parsed = json.loads(result)
        assert "Schema title: Required" in parsed["errors"]

    def test_audit_content_quality_reports_editorial_warnings(self):
        from src.tools.validation import audit_content_quality

        dense_text = " ".join(["palabra"] * 80)
        config = {
            "id": "dense",
            "title": "Dense",
            "description": "Dense",
            "fps": 30,
            "width": 1280,
            "height": 720,
            "theme": "linea-directa",
            "transition": None,
            "scenes": [{"type": "callout", "text": dense_text, "position": "center", "durationInSeconds": 3}],
        }

        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("dense" in warning.lower() for warning in parsed["warnings"])
        assert any("Final scene" in warning for warning in parsed["warnings"])
        assert any("templateId" in recommendation for recommendation in parsed["recommendations"])

    def test_valid_config_all_assets_exist(self, tmp_path, monkeypatch):
        import src.tools.validation as val_mod

        monkeypatch.setattr(val_mod, "PROJECT_ROOT", tmp_path)
        monkeypatch.setattr(val_mod, "_run_remotion_schema_validation", lambda config: ([], []))

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
        monkeypatch.setattr(val_mod, "_run_remotion_schema_validation", lambda config: ([], []))

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
        monkeypatch.setattr(val_mod, "_run_remotion_schema_validation", lambda config: ([], []))

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
        monkeypatch.setattr(val_mod, "_run_remotion_schema_validation", lambda config: ([], []))

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

    def test_split_screen_requires_label_and_items(self):
        from src.tools.validation import audit_content_quality

        config = {
            "id": "bad-split",
            "scenes": [
                {
                    "type": "custom",
                    "componentId": "split-screen",
                    "durationInSeconds": 5,
                    "props": {
                        "left": {"title": "Algorithm", "subtitle": "Lines of code"},
                        "right": {"title": "Recipe", "subtitle": "Step-by-step instructions"},
                    },
                }
            ],
        }

        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("left.label" in error for error in parsed["errors"])
        assert any("left.items" in error for error in parsed["errors"])

    def test_legacy_timing_fields_warning(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "callout",
                    "text": "Hello",
                    "position": "center",
                    "durationInSeconds": 5,
                    "timing": {"leadInMs": 200, "audioStartMs": 150},
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("deprecated" in w.lower() for w in parsed["warnings"])

    def test_dead_air_detection_early_beat(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "custom",
                    "componentId": "bullet-slide",
                    "durationInSeconds": 10,
                    "props": {"title": "Test", "items": [{"text": "a"}]},
                    "beats": [{"id": "b1", "startMs": 50}],
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("before visuals are ready" in e for e in parsed["errors"])

    def test_beat_density_warning(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "intro",
                    "title": "Hello",
                    "durationInSeconds": 5,
                    "beats": [
                        {"id": "b1", "startMs": 200},
                        {"id": "b2", "startMs": 500},
                    ],
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("300ms apart" in w for w in parsed["warnings"])

    def test_tail_breathing_room_warning(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "intro",
                    "title": "Hello",
                    "durationInSeconds": 5,
                    "beats": [{"id": "b1", "startMs": 4900}],
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("rushed" in w.lower() for w in parsed["warnings"])

    def test_duration_content_density_warning(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "benefits",
                    "title": "Benefits",
                    "items": [{"text": "a"}, {"text": "b"}, {"text": "c"}, {"text": "d"}],
                    "durationInSeconds": 5,
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("rushed" in w.lower() for w in parsed["warnings"])

    def test_no_warning_when_timing_is_valid(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "intro",
                    "title": "Hello",
                    "durationInSeconds": 10,
                    "timing": {"tailHoldMs": 500},
                    "beats": [
                        {"id": "b1", "startMs": 200},
                        {"id": "b2", "startMs": 2000},
                    ],
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert not any("deprecated" in w.lower() for w in parsed["warnings"])
        assert not any("before visuals are ready" in e for e in parsed["errors"])
        assert not any("apart" in w for w in parsed["warnings"])
        assert not any("rushed" in w.lower() for w in parsed["warnings"])


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
