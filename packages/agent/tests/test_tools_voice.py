import subprocess

import pytest


def test_generate_voiceover_callable():
    from src.tools.voice import generate_voiceover

    assert callable(generate_voiceover)


def test_generate_voiceover_success(tmp_path, monkeypatch):
    import src.tools.voice as voice_mod

    monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(
            args=cmd,
            returncode=0,
            stdout="Generated 3 scenes: 0.mp3, 1.mp3, 2.mp3",
            stderr="",
        )

    monkeypatch.setattr(subprocess, "run", fake_run)

    from src.tools.voice import generate_voiceover
    result = generate_voiceover(str(tmp_path / "config.json"))
    assert "success" in result.lower() or "generated" in result.lower()


def test_generate_voiceover_failure(tmp_path, monkeypatch):
    import src.tools.voice as voice_mod

    monkeypatch.setattr(voice_mod, "PROJECT_ROOT", tmp_path)

    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(
            args=cmd,
            returncode=1,
            stdout="",
            stderr="Error: GOOGLE_API_KEY not set",
        )

    monkeypatch.setattr(subprocess, "run", fake_run)

    from src.tools.voice import generate_voiceover
    result = generate_voiceover(str(tmp_path / "config.json"))
    assert "error" in result.lower()
    assert "GOOGLE_API_KEY" in result
