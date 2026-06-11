"""Tests del workspace git aislado del modo self_improve.

La allowlist se valida EN CÓDIGO, no en prompt: escenas custom,
customSceneRegistry.ts, skills/prompts del agente y content/.
"""
import subprocess
from pathlib import Path

from src.tools.workspace import commit_and_push, is_path_allowed, prepare_workspace, write_workspace_file


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


# --- prepare_workspace y commit_and_push ---

def _git(cwd, *args):
    return subprocess.run(
        ["git", "-C", str(cwd), "-c", "user.email=t@t", "-c", "user.name=t", *args],
        check=True, capture_output=True, text=True,
    )


def _make_origin(tmp_path):
    """Repo 'origin' bare con un commit semilla en main."""
    origin = tmp_path / "origin.git"
    subprocess.run(["git", "init", "--bare", "-b", "main", str(origin)], check=True, capture_output=True)
    seed = tmp_path / "seed"
    subprocess.run(["git", "clone", str(origin), str(seed)], check=True, capture_output=True)
    (seed / "content").mkdir()
    (seed / "content" / "seed.json").write_text("{}")
    _git(seed, "add", "-A")
    _git(seed, "commit", "-m", "seed")
    _git(seed, "push", "origin", "HEAD:main")
    return origin


def test_prepare_workspace_clones(tmp_path):
    origin = _make_origin(tmp_path)
    ws = tmp_path / "ws"
    result = prepare_workspace(repo_url=f"file://{origin}", base_dir=ws)
    assert not result.startswith("ERROR")
    assert (ws / ".git").exists()
    assert (ws / "content" / "seed.json").exists()


def test_commit_and_push_happy_path(tmp_path):
    origin = _make_origin(tmp_path)
    ws = tmp_path / "ws"
    prepare_workspace(repo_url=f"file://{origin}", base_dir=ws)
    write_workspace_file("content/tutorials/demo/config.json", '{"id": "demo"}', base_dir=ws)
    result = commit_and_push("improve/demo-config", "feat(content): add demo config", base_dir=ws)
    assert not result.startswith("ERROR")
    branches = subprocess.run(
        ["git", "-C", str(origin), "branch"], capture_output=True, text=True
    ).stdout
    assert "improve/demo-config" in branches


def test_commit_rejects_bad_branch_names(tmp_path):
    assert commit_and_push("main", "x", base_dir=tmp_path).startswith("ERROR")
    assert commit_and_push("feature/x", "x", base_dir=tmp_path).startswith("ERROR")
    assert commit_and_push("improve/CON MAYUS", "x", base_dir=tmp_path).startswith("ERROR")


def test_commit_rejects_files_outside_allowlist(tmp_path):
    origin = _make_origin(tmp_path)
    ws = tmp_path / "ws"
    prepare_workspace(repo_url=f"file://{origin}", base_dir=ws)
    # Escritura directa (saltándose write_workspace_file) — defensa en profundidad
    (ws / "package.json").write_text("{}")
    result = commit_and_push("improve/evil", "chore: evil", base_dir=ws)
    assert result.startswith("ERROR")
    assert "package.json" in result


def test_commit_without_changes_errors(tmp_path):
    origin = _make_origin(tmp_path)
    ws = tmp_path / "ws"
    prepare_workspace(repo_url=f"file://{origin}", base_dir=ws)
    result = commit_and_push("improve/empty", "chore: nothing", base_dir=ws)
    assert result.startswith("ERROR")
