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
