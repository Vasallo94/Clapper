import json
import pytest
import httpx
import respx
from src.tools.render import present_escaleta, submit_render, check_render_status


class TestSubmitRender:
    @respx.mock
    def test_submit_render_success(self):
        respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        result = submit_render(
            id="test",
            title="Test",
            description="Test",
            fps=30,
            width=1280,
            height=720,
            theme="linea-directa",
            composition="Tutorial",
            scenes=[{"type": "intro", "title": "Hello", "durationInSeconds": 3}],
        )
        assert result == {"jobId": "abc-123"}

    @respx.mock
    def test_submit_render_validation_error(self):
        respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        # Minimal call — validation happens in render-service
        result = submit_render(id="bad", scenes=[])
        assert "jobId" in result

    @respx.mock
    def test_submit_render_includes_skip_audio_flag(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        submit_render(id="test", scenes=[{"type": "intro", "durationInSeconds": 3}])
        request_body = json.loads(route.calls[0].request.content)
        assert request_body["_skipAudioGeneration"] is True


class TestCheckRenderStatus:
    @respx.mock
    def test_check_status_timeout(self, monkeypatch):
        import src.tools.render as render_mod
        monkeypatch.setattr(render_mod, "RENDER_TIMEOUT_SECONDS", 0)
        respx.get("http://localhost:3100/api/render/abc-123/status").mock(
            return_value=httpx.Response(
                200, json={"jobId": "abc-123", "status": "rendering", "progress": 42}
            )
        )
        result = check_render_status("abc-123")
        assert result["status"] == "timeout"
        assert result["_pipeline_complete"] is True

    @respx.mock
    def test_check_status_done(self):
        respx.get("http://localhost:3100/api/render/done-456/status").mock(
            return_value=httpx.Response(
                200,
                json={
                    "jobId": "done-456",
                    "status": "done",
                    "progress": 100,
                    "output": "/path/to/output.mp4",
                },
            )
        )
        result = check_render_status("done-456")
        assert result["status"] == "done"
        assert result["output"] == "/path/to/output.mp4"


class TestPresentDirection:
    def test_present_direction_uses_interrupt(self):
        import inspect
        from src.tools.render import present_direction

        source = inspect.getsource(present_direction)
        assert "interrupt(" in source

    def test_present_direction_returns_approved(self, monkeypatch):
        import src.tools._checkpoint as cp_mod
        monkeypatch.setattr(cp_mod, "interrupt", lambda v: {"approved": True})
        from src.tools.render import present_direction

        result = present_direction(
            scenes=[{"type": "intro", "durationInSeconds": 3, "timing": {"leadInMs": 300}}],
            warnings=["Intro has no leadInMs"],
        )
        assert "APPROVED" in result

    def test_present_direction_returns_feedback(self, monkeypatch):
        import src.tools._checkpoint as cp_mod
        monkeypatch.setattr(cp_mod, "interrupt", lambda v: {"approved": False, "feedback": "More pauses"})
        from src.tools.render import present_direction

        result = present_direction(
            scenes=[{"type": "intro", "durationInSeconds": 3}],
            warnings=[],
        )
        assert "CHANGES REQUESTED" in result
        assert "More pauses" in result


class TestPresentAudioChart:
    def test_present_audio_chart_uses_interrupt(self):
        import inspect
        from src.tools.sound import present_audio_chart

        source = inspect.getsource(present_audio_chart)
        assert "interrupt(" in source

    def test_present_audio_chart_approved(self, monkeypatch):
        import src.tools._checkpoint as cp_mod
        monkeypatch.setattr(cp_mod, "interrupt", lambda v: {"approved": True})
        from src.tools.sound import present_audio_chart

        result = present_audio_chart(
            voiceover={"provider": "gemini", "voiceId": "Orus", "scenes": {}},
            sound_design={"musicBed": {"libraryId": "lofi-tech"}, "sfx": []},
        )
        assert "APPROVED" in result

    def test_present_audio_chart_feedback(self, monkeypatch):
        import src.tools._checkpoint as cp_mod
        monkeypatch.setattr(cp_mod, "interrupt", lambda v: {"approved": False, "feedback": "Change voice"})
        from src.tools.sound import present_audio_chart

        result = present_audio_chart(
            voiceover={"provider": "gemini", "voiceId": "Orus", "scenes": {}},
            sound_design={"musicBed": {"libraryId": "lofi-tech"}, "sfx": []},
        )
        assert "CHANGES REQUESTED" in result
        assert "Change voice" in result


class TestCopyLibraryTrack:
    def test_copy_music_bed(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "lofi-tech.mp3").write_bytes(b"fake-mp3-data")

        from src.tools.sound import copy_library_track

        result = copy_library_track("lofi-tech", "my-video", "music-bed")
        assert "Copied" in result

        dest = tmp_path / "public" / "audio" / "my-video" / "music-bed.mp3"
        assert dest.exists()
        assert dest.read_bytes() == b"fake-mp3-data"

    def test_copy_sfx(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "sfx-swoosh.mp3").write_bytes(b"swoosh-data")

        from src.tools.sound import copy_library_track

        result = copy_library_track("sfx-swoosh", "my-video", "sfx-swoosh")
        assert "Copied" in result

    def test_copy_track_not_found(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)

        from src.tools.sound import copy_library_track

        result = copy_library_track("nonexistent", "my-video", "music-bed")
        assert "not found" in result.lower()
