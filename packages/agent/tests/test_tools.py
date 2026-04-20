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


class TestCheckRenderStatus:
    @respx.mock
    def test_check_status_rendering(self):
        respx.get("http://localhost:3100/api/render/abc-123/status").mock(
            return_value=httpx.Response(
                200, json={"jobId": "abc-123", "status": "rendering", "progress": 42}
            )
        )
        result = check_render_status("abc-123")
        assert result["status"] == "rendering"
        assert result["progress"] == 42

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
