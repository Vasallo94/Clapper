import json

import pytest


def test_generate_voiceover_callable():
    from src.tools.voice import generate_voiceover

    assert callable(generate_voiceover)


def test_generate_voiceover_disabled():
    from src.tools.voice import generate_voiceover

    config = json.dumps({"id": "test", "voiceover": {"enabled": False}})
    result = generate_voiceover(config)
    assert "not enabled" in result.lower()


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


class TestGenerateSceneAudioDataHandling:
    def test_handles_bytes_directly(self, tmp_path):
        """When Gemini returns bytes, write them directly without base64 decode."""
        from src.tools.voice import _generate_scene_audio

        class FakeAudioPart:
            class inline_data:
                data = b"\x00\x01" * 100  # raw PCM bytes

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

        # Mock _pcm_to_mp3 to avoid needing ffmpeg
        import src.tools.voice as voice_mod
        original_pcm_to_mp3 = voice_mod._pcm_to_mp3
        def fake_pcm_to_mp3(pcm_path, mp3_path):
            mp3_path.write_bytes(pcm_path.read_bytes())
            pcm_path.unlink(missing_ok=True)
        voice_mod._pcm_to_mp3 = fake_pcm_to_mp3

        try:
            result = _generate_scene_audio(FakeClient(), "0", "Hello", "Orus", "es-ES", tmp_path)
            assert "OK" in result
            assert (tmp_path / "0.mp3").exists()
        finally:
            voice_mod._pcm_to_mp3 = original_pcm_to_mp3

    def test_handles_base64_string(self, tmp_path):
        """When Gemini returns a base64 string, decode it properly."""
        import base64
        from src.tools.voice import _generate_scene_audio

        raw_pcm = b"\x00\x01" * 100
        b64_string = base64.b64encode(raw_pcm).decode("ascii")

        class FakeAudioPart:
            class inline_data:
                data = b64_string  # base64-encoded string

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

        import src.tools.voice as voice_mod
        def fake_pcm_to_mp3(pcm_path, mp3_path):
            mp3_path.write_bytes(pcm_path.read_bytes())
            pcm_path.unlink(missing_ok=True)
        original = voice_mod._pcm_to_mp3
        voice_mod._pcm_to_mp3 = fake_pcm_to_mp3

        try:
            result = _generate_scene_audio(FakeClient(), "0", "Hello", "Orus", "es-ES", tmp_path)
            assert "OK" in result
        finally:
            voice_mod._pcm_to_mp3 = original

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
