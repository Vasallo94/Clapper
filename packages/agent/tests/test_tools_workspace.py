"""Tests del workspace git aislado del modo self_improve.

La allowlist se valida EN CÓDIGO, no en prompt: escenas custom,
customSceneRegistry.ts, skills/prompts del agente y content/.
"""
from pathlib import Path

from src.tools.workspace import is_path_allowed, write_workspace_file


# --- allowlist pura ---

def test_allowed_paths():
    assert is_path_allowed("src/compositions/ClaudeCodeTutorial/scenes/custom/NewScene.tsx")
    assert is_path_allowed("src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts")
    assert is_path_allowed("packages/agent/skills/self-improvement/SKILL.md")
    assert is_path_allowed("packages/agent/prompts/improver.md")
    assert is_path_allowed("content/tutorials/demo/config.json")


def test_core_paths_rejected():
    assert not is_path_allowed("src/Root.tsx")
    assert not is_path_allowed("src/themes.ts")
    assert not is_path_allowed("packages/agent/src/orchestrator.py")
    assert not is_path_allowed("packages/render-service/src/index.ts")
    assert not is_path_allowed(".github/workflows/pr-checks.yml")
    assert not is_path_allowed("package.json")


def test_traversal_rejected():
    assert not is_path_allowed("content/../src/Root.tsx")
    assert not is_path_allowed("../../etc/passwd")
    assert not is_path_allowed("/etc/passwd")


# --- escritura sobre workspace ---

def test_write_allowed_file(tmp_path):
    result = write_workspace_file(
        "content/tutorials/demo/config.json", '{"id": "demo"}', base_dir=tmp_path
    )
    assert not result.startswith("ERROR")
    assert (tmp_path / "content/tutorials/demo/config.json").read_text() == '{"id": "demo"}'


def test_write_disallowed_file_errors(tmp_path):
    result = write_workspace_file("src/Root.tsx", "hacked", base_dir=tmp_path)
    assert result.startswith("ERROR")
    assert not (tmp_path / "src/Root.tsx").exists()


def test_write_symlink_escape_errors(tmp_path):
    outside = tmp_path.parent / "outside"
    outside.mkdir(exist_ok=True)
    (tmp_path / "content").symlink_to(outside)
    result = write_workspace_file("content/evil.json", "{}", base_dir=tmp_path)
    assert result.startswith("ERROR")
    assert not (outside / "evil.json").exists()
