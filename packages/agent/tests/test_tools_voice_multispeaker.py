import json

import pytest

import src.tools.voice as voice_mod
from src.tools.voice import (
    DEFAULT_VOICE,
    GEMINI_TTS_VOICES,
    _build_speech_config,
    _fingerprint,
    _is_multi_speaker,
    _sanitize_voice_id,
)


class TestVoiceSet:
    def test_has_30_voices(self):
        assert len(GEMINI_TTS_VOICES) == 30

    def test_contains_all_documented_voices(self):
        expected = {
            "Orus", "Kore", "Aoede", "Puck", "Charon", "Fenrir", "Leda", "Zephyr",
            "Achernar", "Algieba", "Autonoe", "Callirrhoe", "Despina", "Erinome",
            "Gacrux", "Iapetus", "Keid", "Laomedeia", "Pulcherrima", "Rasalgethi",
            "Sadachbia", "Sadaltager", "Schedar", "Sulafat", "Umbriel", "Vindemiatrix",
            "Enceladus", "Thalassa", "Proteus", "Dione",
        }
        assert GEMINI_TTS_VOICES == expected


class TestSanitizeVoiceId:
    def test_valid_voice_passes_through(self):
        assert _sanitize_voice_id("Puck") == "Puck"

    def test_new_voice_passes_through(self):
        assert _sanitize_voice_id("Thalassa") == "Thalassa"

    def test_invalid_voice_falls_back(self):
        assert _sanitize_voice_id("InvalidVoice") == DEFAULT_VOICE

    def test_empty_string_falls_back(self):
        assert _sanitize_voice_id("") == DEFAULT_VOICE


class TestIsMultiSpeaker:
    def test_two_speakers_returns_true(self):
        vo = {"speakers": [{"name": "Ana", "voiceId": "Leda"}, {"name": "Carlos", "voiceId": "Orus"}]}
        assert _is_multi_speaker(vo) is True

    def test_no_speakers_returns_false(self):
        assert _is_multi_speaker({"voiceId": "Orus"}) is False

    def test_one_speaker_returns_false(self):
        assert _is_multi_speaker({"speakers": [{"name": "Ana", "voiceId": "Leda"}]}) is False

    def test_three_speakers_returns_false(self):
        speakers = [{"name": f"S{i}", "voiceId": "Orus"} for i in range(3)]
        assert _is_multi_speaker({"speakers": speakers}) is False

    def test_speakers_none_returns_false(self):
        assert _is_multi_speaker({"speakers": None}) is False


class TestBuildSpeechConfig:
    def test_single_speaker_config(self):
        cfg = _build_speech_config("Puck", "es-ES", None)
        assert cfg["language_code"] == "es-ES"
        assert cfg["voice_config"]["prebuilt_voice_config"]["voice_name"] == "Puck"
        assert "multi_speaker_voice_config" not in cfg

    def test_multi_speaker_config(self):
        speakers = [
            {"name": "Ana", "voiceId": "Leda"},
            {"name": "Carlos", "voiceId": "Orus"},
        ]
        cfg = _build_speech_config("Orus", "es-ES", speakers)
        assert cfg["language_code"] == "es-ES"
        assert "voice_config" not in cfg
        ms = cfg["multi_speaker_voice_config"]["speaker_voice_configs"]
        assert len(ms) == 2
        assert ms[0]["speaker"] == "Ana"
        assert ms[0]["voice_config"]["prebuilt_voice_config"]["voice_name"] == "Leda"
        assert ms[1]["speaker"] == "Carlos"
        assert ms[1]["voice_config"]["prebuilt_voice_config"]["voice_name"] == "Orus"

    def test_multi_speaker_sanitizes_invalid_voice(self):
        speakers = [
            {"name": "Ana", "voiceId": "BadVoice"},
            {"name": "Carlos", "voiceId": "Orus"},
        ]
        cfg = _build_speech_config("Orus", "es-ES", speakers)
        ms = cfg["multi_speaker_voice_config"]["speaker_voice_configs"]
        assert ms[0]["voice_config"]["prebuilt_voice_config"]["voice_name"] == DEFAULT_VOICE


class TestFingerprint:
    def test_stable_without_speakers(self):
        fp1 = _fingerprint("0", "Hola", "Orus", "es-ES", "gemini")
        fp2 = _fingerprint("0", "Hola", "Orus", "es-ES", "gemini")
        assert fp1 == fp2

    def test_changes_with_speakers(self):
        fp_single = _fingerprint("0", "Hola", "Orus", "es-ES", "gemini")
        speakers = [{"name": "Ana", "voiceId": "Leda"}, {"name": "Carlos", "voiceId": "Orus"}]
        fp_multi = _fingerprint("0", "Hola", "Orus", "es-ES", "gemini", speakers=speakers)
        assert fp_single != fp_multi

    def test_different_speakers_different_fp(self):
        s1 = [{"name": "Ana", "voiceId": "Leda"}, {"name": "Carlos", "voiceId": "Orus"}]
        s2 = [{"name": "Ana", "voiceId": "Puck"}, {"name": "Carlos", "voiceId": "Orus"}]
        fp1 = _fingerprint("0", "Hola", "Orus", "es-ES", "gemini", speakers=s1)
        fp2 = _fingerprint("0", "Hola", "Orus", "es-ES", "gemini", speakers=s2)
        assert fp1 != fp2


class TestGenerateVoiceoverMultiSpeaker:
    @pytest.fixture()
    def fake_env(self, tmp_path, monkeypatch):
        monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)
        captured = {}

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
                    captured["last_kwargs"] = kwargs
                    return FakeResponse()

        monkeypatch.setattr(voice_mod, "_get_genai_client", lambda: FakeClient())
        monkeypatch.setattr(voice_mod, "_pcm_to_mp3", lambda pcm, mp3: mp3.write_bytes(b"\xff\xfb\x90\x00"))
        return captured

    def test_multi_speaker_mode_label(self, fake_env):
        config = json.dumps({
            "id": "podcast",
            "voiceover": {
                "enabled": True,
                "provider": "gemini",
                "language": "es-ES",
                "speakers": [
                    {"name": "Ana", "voiceId": "Leda"},
                    {"name": "Carlos", "voiceId": "Orus"},
                ],
                "scenes": {"0": {"text": "Ana: Hola.\nCarlos: Hola."}},
            },
        })
        result = voice_mod.generate_voiceover(config)
        assert "multi-speaker" in result
        assert "1 OK" in result

    def test_multi_speaker_api_call_shape(self, fake_env):
        config = json.dumps({
            "id": "podcast",
            "voiceover": {
                "enabled": True,
                "provider": "gemini",
                "language": "en-US",
                "speakers": [
                    {"name": "Ana", "voiceId": "Leda"},
                    {"name": "Carlos", "voiceId": "Charon"},
                ],
                "scenes": {"0": {"text": "Ana: Hello.\nCarlos: Hi there."}},
            },
        })
        voice_mod.generate_voiceover(config)
        speech_cfg = fake_env["last_kwargs"]["config"]["speech_config"]
        assert "multi_speaker_voice_config" in speech_cfg
        assert "voice_config" not in speech_cfg

    def test_single_speaker_api_call_shape(self, fake_env):
        config = json.dumps({
            "id": "tutorial",
            "voiceover": {
                "enabled": True,
                "provider": "gemini",
                "voiceId": "Puck",
                "language": "es-ES",
                "scenes": {"0": {"text": "Hola mundo"}},
            },
        })
        voice_mod.generate_voiceover(config)
        speech_cfg = fake_env["last_kwargs"]["config"]["speech_config"]
        assert "voice_config" in speech_cfg
        assert "multi_speaker_voice_config" not in speech_cfg
        assert speech_cfg["voice_config"]["prebuilt_voice_config"]["voice_name"] == "Puck"

    def test_single_speaker_mode_label(self, fake_env):
        config = json.dumps({
            "id": "tutorial",
            "voiceover": {
                "enabled": True,
                "voiceId": "Orus",
                "language": "es-ES",
                "scenes": {"0": {"text": "Hola mundo"}},
            },
        })
        result = voice_mod.generate_voiceover(config)
        assert "single-speaker" in result

    def test_scenes_as_list_format(self, fake_env):
        config = json.dumps({
            "id": "list-fmt",
            "voiceover": {
                "enabled": True,
                "voiceId": "Orus",
                "language": "es-ES",
                "scenes": [
                    {"sceneIndex": 0, "text": "Primera escena"},
                    {"sceneIndex": 1, "text": "Segunda escena"},
                ],
            },
        })
        result = voice_mod.generate_voiceover(config)
        assert "2 OK" in result
        assert "0 errors" in result
