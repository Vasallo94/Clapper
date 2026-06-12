"""Tests del backlog de auto-mejora sobre drafts AFP."""
import json
from pathlib import Path

from src.tools.backlog import (
    list_friction_drafts,
    mark_draft_addressed,
    read_friction_draft,
)


def _seed_draft(tmp_path: Path, name: str = "report-001.json", severity: str = "degraded") -> Path:
    drafts = tmp_path / ".afp" / "drafts"
    drafts.mkdir(parents=True, exist_ok=True)
    path = drafts / name
    path.write_text(json.dumps({
        "subject_uri": "afp:app/claqueta/claqueta#render-service",
        "goal": "renderizar escena 3",
        "friction_type": "wrong_output",
        "severity": severity,
        "tool_call_name": "render-service",
    }), encoding="utf-8")
    return path


def test_list_empty_backlog(tmp_path):
    result = list_friction_drafts(base_dir=tmp_path)
    assert result["pending"] == []
    assert result["pending_count"] == 0
    assert result["threshold_reached"] is False


def test_list_pending_drafts(tmp_path):
    _seed_draft(tmp_path, "a.json")
    _seed_draft(tmp_path, "b.json", severity="blocked")
    result = list_friction_drafts(base_dir=tmp_path)
    assert result["pending_count"] == 2
    refs = {d["ref"] for d in result["pending"]}
    assert refs == {"a.json", "b.json"}
    assert {d["severity"] for d in result["pending"]} == {"degraded", "blocked"}


def test_threshold_reached(tmp_path, monkeypatch):
    monkeypatch.setenv("SELF_IMPROVE_THRESHOLD", "2")
    _seed_draft(tmp_path, "a.json")
    _seed_draft(tmp_path, "b.json")
    result = list_friction_drafts(base_dir=tmp_path)
    assert result["threshold"] == 2
    assert result["threshold_reached"] is True


def test_corrupt_draft_is_skipped_not_fatal(tmp_path):
    _seed_draft(tmp_path, "good.json")
    (tmp_path / ".afp" / "drafts" / "bad.json").write_text("{not json", encoding="utf-8")
    result = list_friction_drafts(base_dir=tmp_path)
    assert result["pending_count"] == 1
    assert result["corrupt"] == ["bad.json"]


def test_read_draft(tmp_path):
    _seed_draft(tmp_path)
    data = read_friction_draft("report-001.json", base_dir=tmp_path)
    assert data["goal"] == "renderizar escena 3"


def test_read_draft_rejects_traversal(tmp_path):
    result = read_friction_draft("../../etc/passwd", base_dir=tmp_path)
    assert isinstance(result, str) and result.startswith("ERROR")


def test_mark_addressed_writes_sidecar_and_excludes_from_pending(tmp_path):
    draft = _seed_draft(tmp_path)
    result = mark_draft_addressed("report-001.json", "https://github.com/Vasallo94/Claqueta/pull/99", base_dir=tmp_path)
    assert "pull/99" in result
    sidecar = draft.with_suffix(".json.addressed")
    assert sidecar.exists()
    assert json.loads(sidecar.read_text())["pr_url"].endswith("/pull/99")
    listing = list_friction_drafts(base_dir=tmp_path)
    assert listing["pending_count"] == 0
    assert listing["addressed"][0]["ref"] == "report-001.json"
