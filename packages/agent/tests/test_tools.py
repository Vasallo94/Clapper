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

    @respx.mock
    def test_submit_render_includes_voiceover(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        vo = {"enabled": True, "provider": "gemini", "voiceId": "Orus", "scenes": {}}
        submit_render(id="test", scenes=[{"type": "intro", "durationInSeconds": 3}], voiceover=vo)
        body = json.loads(route.calls[0].request.content)
        assert body["voiceover"] == vo
        assert "_skipAudioGeneration" not in body

    @respx.mock
    def test_submit_render_includes_sound_design(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        sd = {"enabled": True, "musicBed": {"libraryId": "lofi-tech"}, "sfx": []}
        submit_render(id="test", scenes=[{"type": "intro", "durationInSeconds": 3}], sound_design=sd)
        body = json.loads(route.calls[0].request.content)
        assert body["soundDesign"] == sd
        assert "_skipAudioGeneration" not in body

    @respx.mock
    def test_default_dimensions_are_tutorial(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        submit_render(id="test", scenes=[{"type": "intro", "durationInSeconds": 3}])
        body = json.loads(route.calls[0].request.content)
        assert body["width"] == 1280
        assert body["height"] == 720

    @respx.mock
    def test_default_composition_is_not_product_short(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        submit_render(id="test", scenes=[{"type": "intro", "durationInSeconds": 3}])
        body = json.loads(route.calls[0].request.content)
        assert body.get("composition", "") != "ProductShort"

    @respx.mock
    def test_submit_render_both_audio_fields(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "abc-123"})
        )
        vo = {"enabled": True, "provider": "gemini", "voiceId": "Orus", "scenes": {}}
        sd = {"enabled": True, "musicBed": {"libraryId": "lofi-tech"}, "sfx": []}
        submit_render(id="test", scenes=[], voiceover=vo, sound_design=sd)
        body = json.loads(route.calls[0].request.content)
        assert body["voiceover"] == vo
        assert body["soundDesign"] == sd
        assert "_skipAudioGeneration" not in body


class TestSubmitRenderWithRuntime:
    @respx.mock
    def test_submit_render_uses_runtime_render_url(self):
        custom_url = "http://custom-render:9999"
        respx.post(f"{custom_url}/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "rt-123"})
        )
        from unittest.mock import MagicMock
        from src.context import PipelineContext

        runtime = MagicMock()
        runtime.context = PipelineContext(
            config_id="test",
            render_service_url=custom_url,
        )

        result = submit_render(
            id="test",
            scenes=[{"type": "intro", "durationInSeconds": 3}],
            runtime=runtime,
        )
        assert result == {"jobId": "rt-123"}

    @respx.mock
    def test_submit_render_uses_runtime_dimensions(self):
        route = respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "dim-123"})
        )
        from unittest.mock import MagicMock
        from src.context import PipelineContext

        runtime = MagicMock()
        runtime.context = PipelineContext(
            config_id="test",
            width=1080,
            height=1920,
            composition="ProductShort",
        )

        submit_render(
            id="test",
            scenes=[{"type": "hero", "durationInSeconds": 3}],
            runtime=runtime,
        )
        body = json.loads(route.calls[0].request.content)
        assert body["width"] == 1080
        assert body["height"] == 1920

    @respx.mock
    def test_submit_render_works_without_runtime(self):
        respx.post("http://localhost:3100/api/render").mock(
            return_value=httpx.Response(200, json={"jobId": "no-rt"})
        )
        result = submit_render(id="test", scenes=[])
        assert result == {"jobId": "no-rt"}


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


class TestCheckRenderStatusRuntime:
    @respx.mock
    def test_uses_runtime_render_url(self, monkeypatch):
        from unittest.mock import MagicMock
        from src.context import PipelineContext

        route = respx.get("http://custom:9000/api/render/job-rt/status").mock(
            return_value=httpx.Response(
                200, json={"status": "done", "progress": 100, "output": "/out.mp4"}
            )
        )
        runtime = MagicMock()
        runtime.context = PipelineContext(config_id="test", render_service_url="http://custom:9000")

        result = check_render_status("job-rt", runtime=runtime)
        assert result["status"] == "done"
        assert route.called

    @respx.mock
    def test_works_without_runtime(self):
        respx.get("http://localhost:3100/api/render/job-no-rt/status").mock(
            return_value=httpx.Response(
                200, json={"status": "done", "progress": 100}
            )
        )
        result = check_render_status("job-no-rt")
        assert result["status"] == "done"


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


class TestCopyLibraryTrackRuntime:
    def test_uses_runtime_config_id(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "lofi-tech.mp3").write_bytes(b"fake-mp3")

        from unittest.mock import MagicMock
        from src.context import PipelineContext

        runtime = MagicMock()
        runtime.context = PipelineContext(config_id="rt-video")

        from src.tools.sound import copy_library_track
        result = copy_library_track("lofi-tech", "ignored-id", "music-bed", runtime=runtime)
        assert "Copied" in result
        dest = tmp_path / "public" / "audio" / "rt-video" / "music-bed.mp3"
        assert dest.exists()

    def test_falls_back_to_arg_without_runtime(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "lofi-tech.mp3").write_bytes(b"fake-mp3")

        from src.tools.sound import copy_library_track
        result = copy_library_track("lofi-tech", "arg-id", "music-bed")
        assert "Copied" in result
        dest = tmp_path / "public" / "audio" / "arg-id" / "music-bed.mp3"
        assert dest.exists()


class TestListAudioLibrary:
    def test_lists_mp3_files_not_dirs(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "lofi-tech.mp3").write_bytes(b"fake")
        (library_dir / "lofi-tech-2.mp3").write_bytes(b"fake")
        (library_dir / "some-dir").mkdir()

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        import json
        tracks = json.loads(result)
        assert tracks == ["lofi-tech", "lofi-tech-2"]

    def test_returns_stems_without_extension(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "track-one.mp3").write_bytes(b"fake")

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        import json
        tracks = json.loads(result)
        assert tracks == ["track-one"]
        assert ".mp3" not in tracks[0]

    def test_ignores_non_mp3_files(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)
        (library_dir / "track.mp3").write_bytes(b"fake")
        (library_dir / "readme.txt").write_text("info")
        (library_dir / ".DS_Store").write_bytes(b"x")

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        import json
        tracks = json.loads(result)
        assert tracks == ["track"]

    def test_empty_library(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        library_dir = tmp_path / "public" / "audio" / "library"
        library_dir.mkdir(parents=True)

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        assert result == "No tracks found."

    def test_missing_library_dir(self, tmp_path, monkeypatch):
        import src.tools.sound as sound_mod
        monkeypatch.setattr(sound_mod, "PROJECT_ROOT", tmp_path)

        from src.tools.sound import list_audio_library
        result = list_audio_library()
        assert "No audio library" in result
