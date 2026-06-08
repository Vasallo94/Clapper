import json
from pathlib import Path

from src.tools import configs


def write_config(path: Path, config_id: str = "demo", title: str = "Demo") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "id": config_id,
                "title": title,
                "description": "Demo config",
                "fps": 30,
                "width": 1280,
                "height": 720,
                "theme": "linea-directa",
                "scenes": [{"type": "intro", "title": "Hola", "durationInSeconds": 3}],
            }
        ),
        encoding="utf-8",
    )


def test_list_video_configs(monkeypatch, tmp_path):
    monkeypatch.setattr(configs, "PROJECT_ROOT", tmp_path)
    write_config(tmp_path / "content/tutorials/demo/config.json")

    result = configs.list_video_configs()

    assert result["configs"][0]["configPath"] == "content/tutorials/demo/config.json"
    assert result["configs"][0]["configId"] == "demo"
    assert result["configs"][0]["durationSeconds"] == 3


def test_load_video_config_by_slug(monkeypatch, tmp_path):
    monkeypatch.setattr(configs, "PROJECT_ROOT", tmp_path)
    write_config(tmp_path / "content/tutorials/demo/config.json")

    result = configs.load_video_config("demo")

    assert result["sourcePath"] == "content/tutorials/demo/config.json"
    assert result["config"]["id"] == "demo"
    assert '"id": "demo"' in result["content"]


def test_stage_existing_config_returns_pipeline_instruction(monkeypatch, tmp_path):
    monkeypatch.setattr(configs, "PROJECT_ROOT", tmp_path)
    write_config(tmp_path / "content/tutorials/demo/config.json")

    result = configs.stage_existing_config("content/tutorials/demo/config.json")

    assert result["pipelinePath"] == "/pipeline/config.json"
    assert result["sourcePath"] == "content/tutorials/demo/config.json"
    assert "write" in result["instruction"].lower()


def test_save_pipeline_config_to_source_creates_backup(monkeypatch, tmp_path):
    monkeypatch.setattr(configs, "PROJECT_ROOT", tmp_path)
    config_path = tmp_path / "content/tutorials/demo/config.json"
    write_config(config_path)

    updated = json.loads(config_path.read_text(encoding="utf-8"))
    updated["title"] = "Demo actualizado"
    result = configs.save_pipeline_config_to_source("demo", json.dumps(updated))

    assert result["saved"] is True
    assert result["sourcePath"] == "content/tutorials/demo/config.json"
    assert (tmp_path / "content/tutorials/demo/config.json.bak").exists()
    assert json.loads(config_path.read_text(encoding="utf-8"))["title"] == "Demo actualizado"


def test_load_video_config_rejects_paths_outside_project(monkeypatch, tmp_path):
    monkeypatch.setattr(configs, "PROJECT_ROOT", tmp_path)

    try:
        configs.load_video_config("/etc/passwd")
    except ValueError as exc:
        assert "outside project root" in str(exc)
    else:
        raise AssertionError("Expected ValueError for outside path")


def test_resolve_prefers_content_over_generated_renders(monkeypatch, tmp_path):
    monkeypatch.setattr(configs, "PROJECT_ROOT", tmp_path)
    write_config(tmp_path / "content/tutorials/que-es-git/config.json", config_id="que-es-git", title="Git")
    write_config(tmp_path / ".generated/renders/job-aaa/config.json", config_id="que-es-git", title="Git")
    write_config(tmp_path / ".generated/renders/job-bbb/config.json", config_id="que-es-git", title="Git")

    result = configs.load_video_config("que-es-git")

    assert result["sourcePath"] == "content/tutorials/que-es-git/config.json"


def test_present_target_selection_returns_selected_target(monkeypatch):
    monkeypatch.setattr(
        configs,
        "interrupt",
        lambda value: {"approved": True, "target": {"configPath": "content/tutorials/demo/config.json"}},
    )

    result = configs.present_target_selection("revise_existing", [{"configPath": "content/tutorials/demo/config.json"}])

    assert "APPROVED" in result
    assert "content/tutorials/demo/config.json" in result
