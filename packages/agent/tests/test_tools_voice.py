import json

import pytest


def test_generate_voiceover_callable():
    from src.tools.voice import generate_voiceover

    assert callable(generate_voiceover)


def test_generate_voiceover_disabled():
    from src.tools.voice import generate_voiceover

    config = json.dumps({"id": "test", "voiceover": {"enabled": False}})
    result = generate_voiceover(config)
    assert "no scenes" in result.lower()


def test_generate_voiceover_no_credentials(monkeypatch):
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    monkeypatch.delenv("GOOGLE_AI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    from src.tools.voice import generate_voiceover

    config = json.dumps({
        "id": "test",
        "voiceover": {"enabled": True, "scenes": {"0": {"text": "hola"}}},
    })
    result = generate_voiceover(config)
    assert "error" in result.lower()
    assert "credentials" in result.lower()


def test_generate_voiceover_success(tmp_path, monkeypatch):
    import src.tools.voice as voice_mod

    monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

    class FakeResponse:
        class FakeCandidate:
            class FakeContent:
                class FakePart:
                    class FakeInlineData:
                        data = "AAAA"  # minimal base64
                    inline_data = FakeInlineData()
                parts = [FakePart()]
            content = FakeContent()
        candidates = [FakeCandidate()]

    class FakeClient:
        class models:
            @staticmethod
            def generate_content(**kwargs):
                return FakeResponse()

    monkeypatch.setattr(voice_mod, "_get_genai_client", lambda: FakeClient())
    monkeypatch.setattr(voice_mod, "_pcm_to_mp3", lambda pcm, mp3: mp3.write_bytes(b"\xff\xfb\x90\x00"))

    from src.tools.voice import generate_voiceover

    config = json.dumps({
        "id": "test-vid",
        "voiceover": {
            "enabled": True,
            "voiceId": "Orus",
            "language": "es-ES",
            "scenes": {"0": {"text": "Hola mundo"}},
        },
    })
    result = generate_voiceover(config)
    assert "1 OK" in result
    assert "0 errors" in result
    assert (tmp_path / "public" / "voiceover" / "test-vid" / "0.mp3").exists()


class TestFindFfmpeg:
    def test_uses_ffmpeg_path_env_var(self, tmp_path, monkeypatch):
        ffmpeg_bin = tmp_path / "custom-ffmpeg"
        ffmpeg_bin.write_text("#!/bin/sh\n")
        monkeypatch.setenv("FFMPEG_PATH", str(ffmpeg_bin))

        from src.tools.voice import _find_ffmpeg

        assert _find_ffmpeg() == str(ffmpeg_bin)

    def test_uses_system_ffmpeg_when_no_env(self, monkeypatch):
        monkeypatch.delenv("FFMPEG_PATH", raising=False)
        import shutil

        if shutil.which("ffmpeg"):
            from src.tools.voice import _find_ffmpeg

            result = _find_ffmpeg()
            assert "ffmpeg" in result.lower()

    def test_raises_when_not_found(self, monkeypatch):
        monkeypatch.delenv("FFMPEG_PATH", raising=False)
        monkeypatch.setattr("shutil.which", lambda x: None)

        from src.tools.voice import _find_ffmpeg

        with pytest.raises(FileNotFoundError, match="ffmpeg not found"):
            _find_ffmpeg()


class TestGenerateSceneAudioDataHandling:
    def test_handles_bytes_directly(self, tmp_path, monkeypatch):
        """When Gemini returns bytes, write them directly without base64 decode."""
        import src.tools.voice as voice_mod
        from src.tools.voice import _generate_scene_audio

        class FakeAudioPart:
            class inline_data:
                data = b"\x00\x01" * 100

        class FakeCandidate:
            class content:
                parts = [FakeAudioPart()]

        class FakeResponse:
            candidates = [FakeCandidate()]

        class FakeClient:
            class models:
                @staticmethod
                def generate_content(**kwargs):
                    return FakeResponse()

        def fake_pcm_to_mp3(pcm_path, mp3_path):
            mp3_path.write_bytes(pcm_path.read_bytes())
            pcm_path.unlink(missing_ok=True)

        monkeypatch.setattr(voice_mod, "_pcm_to_mp3", fake_pcm_to_mp3)
        result = _generate_scene_audio(FakeClient(), "0", "Hello", "Orus", "es-ES", tmp_path)
        assert "OK" in result
        assert (tmp_path / "0.mp3").exists()

    def test_handles_base64_string(self, tmp_path, monkeypatch):
        """When Gemini returns a base64 string, decode it properly."""
        import base64
        import src.tools.voice as voice_mod
        from src.tools.voice import _generate_scene_audio

        raw_pcm = b"\x00\x01" * 100
        b64_string = base64.b64encode(raw_pcm).decode("ascii")

        class FakeAudioPart:
            class inline_data:
                data = b64_string

        class FakeCandidate:
            class content:
                parts = [FakeAudioPart()]

        class FakeResponse:
            candidates = [FakeCandidate()]

        class FakeClient:
            class models:
                @staticmethod
                def generate_content(**kwargs):
                    return FakeResponse()

        def fake_pcm_to_mp3(pcm_path, mp3_path):
            mp3_path.write_bytes(pcm_path.read_bytes())
            pcm_path.unlink(missing_ok=True)

        monkeypatch.setattr(voice_mod, "_pcm_to_mp3", fake_pcm_to_mp3)
        result = _generate_scene_audio(FakeClient(), "0", "Hello", "Orus", "es-ES", tmp_path)
        assert "OK" in result

    def test_rejects_unexpected_type(self, tmp_path):
        """When Gemini returns an unexpected type, raise ValueError."""
        from src.tools.voice import _generate_scene_audio

        class FakeAudioPart:
            class inline_data:
                data = 12345  # unexpected type

        class FakeCandidate:
            class content:
                parts = [FakeAudioPart()]

        class FakeResponse:
            candidates = [FakeCandidate()]

        class FakeClient:
            class models:
                @staticmethod
                def generate_content(**kwargs):
                    return FakeResponse()

        with pytest.raises(ValueError, match="Unexpected audio data type"):
            _generate_scene_audio(FakeClient(), "0", "Hello", "Orus", "es-ES", tmp_path)


class TestGenerateVoiceoverEnabledGate:
    def test_generates_when_voiceover_has_scenes_but_no_enabled(self, monkeypatch):
        """If voiceover config has scenes, generate even without enabled: true."""
        import src.tools.voice as voice_mod
        monkeypatch.setattr(voice_mod, "_get_genai_client", lambda: None)

        config = {
            "id": "test",
            "voiceover": {
                "provider": "gemini",
                "voiceId": "Orus",
                "language": "es-ES",
                "scenes": {"0": {"text": "Hello"}},
            },
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        result = voice_mod.generate_voiceover(json.dumps(config))
        # Should try to generate (fail on credentials), not return "not enabled"
        assert "not enabled" not in result.lower()

    def test_returns_early_when_no_voiceover_section(self):
        """If there's no voiceover section at all, return early."""
        from src.tools.voice import generate_voiceover
        config = {"id": "test", "scenes": [{"type": "intro", "durationInSeconds": 3}]}
        result = generate_voiceover(json.dumps(config))
        assert "not enabled" in result.lower() or "no voiceover" in result.lower()

    def test_returns_early_when_no_scenes_in_voiceover(self):
        """If voiceover section has no scenes, return early."""
        from src.tools.voice import generate_voiceover
        config = {
            "id": "test",
            "voiceover": {"provider": "gemini", "voiceId": "Orus"},
            "scenes": [{"type": "intro", "durationInSeconds": 3}],
        }
        result = generate_voiceover(json.dumps(config))
        assert "no scenes" in result.lower()


class TestGenerateVoiceoverRuntime:
    def test_uses_runtime_config_id_for_output_dir(self, tmp_path, monkeypatch):
        """runtime.context.config_id wins over the JSON config id for the output dir."""
        import src.tools.voice as voice_mod
        monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

        from unittest.mock import MagicMock
        from src.context import PipelineContext

        runtime = MagicMock()
        runtime.context = PipelineContext(
            config_id="runtime-video",
            output_dir=str(tmp_path),
        )

        # Provide a real scene with text so the function reaches dir-creation code.
        class FakeResponse:
            class FakeCandidate:
                class FakeContent:
                    class FakePart:
                        class FakeInlineData:
                            data = "AAAA"
                        inline_data = FakeInlineData()
                    parts = [FakePart()]
                content = FakeContent()
            candidates = [FakeCandidate()]

        class FakeClient:
            class models:
                @staticmethod
                def generate_content(**kwargs):
                    return FakeResponse()

        monkeypatch.setattr(voice_mod, "_get_genai_client", lambda: FakeClient())
        monkeypatch.setattr(voice_mod, "_pcm_to_mp3", lambda pcm, mp3: mp3.write_bytes(b"\xff\xfb\x90\x00"))

        config = {
            "id": "json-video",
            "voiceover": {
                "voiceId": "Orus",
                "language": "es-ES",
                "scenes": {"0": {"text": "Hola mundo"}},
            },
        }

        result = voice_mod.generate_voiceover(json.dumps(config), runtime=runtime)

        # Output dir must use runtime's config_id, not the JSON id.
        runtime_dir = tmp_path / "public" / "voiceover" / "runtime-video"
        json_dir = tmp_path / "public" / "voiceover" / "json-video"
        assert runtime_dir.exists(), f"Expected runtime dir to exist. Result: {result}"
        assert not json_dir.exists(), "JSON config id dir should NOT be created when runtime is provided"
        assert "1 OK" in result

    def test_works_without_runtime(self, tmp_path, monkeypatch):
        """Without runtime, falls back to config JSON id for the output dir."""
        import src.tools.voice as voice_mod
        monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

        class FakeResponse:
            class FakeCandidate:
                class FakeContent:
                    class FakePart:
                        class FakeInlineData:
                            data = "AAAA"
                        inline_data = FakeInlineData()
                    parts = [FakePart()]
                content = FakeContent()
            candidates = [FakeCandidate()]

        class FakeClient:
            class models:
                @staticmethod
                def generate_content(**kwargs):
                    return FakeResponse()

        monkeypatch.setattr(voice_mod, "_get_genai_client", lambda: FakeClient())
        monkeypatch.setattr(voice_mod, "_pcm_to_mp3", lambda pcm, mp3: mp3.write_bytes(b"\xff\xfb\x90\x00"))

        config = {
            "id": "plain-video",
            "voiceover": {
                "voiceId": "Orus",
                "language": "es-ES",
                "scenes": {"0": {"text": "Hola mundo"}},
            },
        }
        result = voice_mod.generate_voiceover(json.dumps(config))
        expected_dir = tmp_path / "public" / "voiceover" / "plain-video"
        assert expected_dir.exists(), f"Expected plain-video dir to exist. Result: {result}"
        assert "1 OK" in result
