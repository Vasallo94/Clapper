# Self-Improve Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nuevo modo `self_improve` del orquestador: el agente lee su backlog de fricción AFP, propone un plan aprobado por humano, ejecuta cambios en un clone aislado y abre PRs en GitHub.

**Architecture:** Se extiende el sistema de contratos de modos existente (`modes.py`, ADR-0009) con un modo nuevo y un subagente `improver`. El backlog son los drafts AFP de `.afp/drafts/` (sin sistema de tracking nuevo). Las escrituras pasan por una allowlist dura en código; el trabajo git ocurre en `.generated/workspace/` (clone superficial), nunca sobre el working tree del host.

**Tech Stack:** Python 3.12, DeepAgents/LangGraph, httpx (ya en deps), respx para mocks HTTP (ya en dev deps), git CLI, API REST de GitHub, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-06-11-self-improve-mode-design.md`

**Comandos de test:** desde `packages/agent/`: `uv run pytest tests/<archivo> -v`

---

### Task 1: Contrato de modo `self_improve`

**Files:**

- Modify: `packages/agent/src/modes.py`
- Test: `packages/agent/tests/test_modes.py`

- [ ] **Step 1: Escribir tests que fallan**

Añadir al final de `packages/agent/tests/test_modes.py`:

```python
def test_self_improve_contract():
    contract = get_mode_contract("self_improve")
    assert contract["mode"] == "self_improve"
    assert contract["requires_target"] is False
    assert contract["can_write_files"] is True
    assert contract["can_render"] is True
    assert contract["allowed_agents"] == ["improver"]
    assert "improvement_plan_approval" in contract["checkpoints"]


def test_route_intent_self_improve():
    decision = route_intent("self_improve", "revisa tu fricción acumulada")
    assert decision["mode"] == "self_improve"
    assert decision["requires_checkpoint"] is True
    assert decision["missing_target"] is False
```

(Si el archivo no importa ya `get_mode_contract` y `route_intent`, añadirlos al import existente de `src.modes`.)

- [ ] **Step 2: Verificar que fallan**

Run: `cd packages/agent && uv run pytest tests/test_modes.py -v`
Expected: FAIL — `KeyError: 'self_improve'`

- [ ] **Step 3: Implementar el contrato**

En `packages/agent/src/modes.py`:

1. Añadir `"self_improve"` al `Literal` de `ModeName` y a `ALL_MODES`.
2. Añadir al dict `MODE_CONTRACTS` (después de `"question"`):

```python
    "self_improve": ModeContract(
        mode="self_improve",
        description="Review accumulated friction (AFP drafts) and ship improvements to Claqueta's own creative code as GitHub PRs for human review.",
        requires_target=False,
        can_write_files=True,
        can_render=True,
        allowed_agents=("improver",),
        forbidden_agents=(
            "researcher",
            "copywriter",
            "director",
            "audio_planner",
            "voice_generator",
            "sound_engineer",
            "scene_creator",
            "validator",
            "reviewer",
        ),
        checkpoints=("improvement_plan_approval",),
        rules=(
            "Read the friction backlog before proposing anything.",
            "Present an improvement plan and wait for explicit human approval before touching any code.",
            "All changes go to an improve/* branch and a GitHub PR — never commit to main.",
            "Only edit files inside the write allowlist (custom scenes, agent skills/prompts, content configs).",
            "If a change touches scenes, render a sample video as PR evidence; if the render fails, do not open the PR.",
        ),
    ),
```

- [ ] **Step 4: Verificar que pasan**

Run: `cd packages/agent && uv run pytest tests/test_modes.py -v`
Expected: PASS (todos, incluidos los existentes)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/modes.py packages/agent/tests/test_modes.py
git commit -m "feat(agent): add self_improve mode contract"
```

---

### Task 2: Tools de backlog sobre drafts AFP

**Files:**

- Create: `packages/agent/src/tools/backlog.py`
- Test: `packages/agent/tests/test_tools_backlog.py`

Los drafts AFP son JSON en `.afp/drafts/`. No se modifican (los valida `afp`); "addressed" se marca con un sidecar `<draft>.addressed` para no corromper el report.

- [ ] **Step 1: Escribir tests que fallan**

Crear `packages/agent/tests/test_tools_backlog.py`:

```python
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
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd packages/agent && uv run pytest tests/test_tools_backlog.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.tools.backlog'`

- [ ] **Step 3: Implementar**

Crear `packages/agent/src/tools/backlog.py`:

```python
"""Backlog de auto-mejora: lectura y anotación de drafts AFP (.afp/drafts/).

Los drafts son la unidad de trabajo del modo self_improve. Nunca se
modifican ni borran (su ciclo de vida AFP es humano); "addressed" se
registra en un sidecar <draft>.addressed con la URL del PR.
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..paths import PROJECT_ROOT

DEFAULT_THRESHOLD = 5


def _drafts_dir(base_dir: Optional[Path] = None) -> Path:
    root = Path(base_dir) if base_dir is not None else PROJECT_ROOT
    return root / ".afp" / "drafts"


def _sidecar(draft_path: Path) -> Path:
    return draft_path.with_suffix(draft_path.suffix + ".addressed")


def _safe_draft_path(ref: str, base_dir: Optional[Path]) -> Path | None:
    if Path(ref).name != ref or not ref.endswith(".json"):
        return None
    return _drafts_dir(base_dir) / ref


def list_friction_drafts(base_dir: Optional[Path] = None) -> dict:
    """Lista el backlog de fricción: drafts AFP pendientes y ya abordados.

    Devuelve pending/addressed/corrupt, el umbral SELF_IMPROVE_THRESHOLD
    y threshold_reached para que el orquestador proponga (no inicie) una
    sesión de mejora al cerrar un vídeo.
    """
    drafts_dir = _drafts_dir(base_dir)
    pending: list[dict] = []
    addressed: list[dict] = []
    corrupt: list[str] = []
    paths = sorted(drafts_dir.glob("*.json")) if drafts_dir.is_dir() else []
    for path in paths:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            corrupt.append(path.name)
            continue
        summary = {
            "ref": path.name,
            "severity": data.get("severity"),
            "component": data.get("tool_call_name"),
            "friction_type": data.get("friction_type"),
            "goal": data.get("goal"),
        }
        (addressed if _sidecar(path).exists() else pending).append(summary)
    threshold = int(os.environ.get("SELF_IMPROVE_THRESHOLD", DEFAULT_THRESHOLD))
    return {
        "pending": pending,
        "addressed": addressed,
        "corrupt": corrupt,
        "pending_count": len(pending),
        "threshold": threshold,
        "threshold_reached": len(pending) >= threshold,
    }


def read_friction_draft(ref: str, base_dir: Optional[Path] = None) -> dict | str:
    """Devuelve el contenido completo de un draft AFP del backlog.

    Args:
        ref: Nombre del archivo draft tal y como lo devolvió list_friction_drafts.
    """
    path = _safe_draft_path(ref, base_dir)
    if path is None:
        return "ERROR: ref inválida — usa el nombre de archivo devuelto por list_friction_drafts."
    if not path.is_file():
        return f"ERROR: no existe el draft {ref}."
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return f"ERROR: el draft {ref} no es JSON válido."


def mark_draft_addressed(ref: str, pr_url: str, base_dir: Optional[Path] = None) -> str:
    """Anota un draft como abordado por un PR (sidecar; el draft no se toca).

    Args:
        ref: Nombre del archivo draft.
        pr_url: URL del pull request que aborda esta fricción.
    """
    path = _safe_draft_path(ref, base_dir)
    if path is None or not path.is_file():
        return f"ERROR: no existe el draft {ref}."
    _sidecar(path).write_text(
        json.dumps({"pr_url": pr_url, "at": datetime.now(timezone.utc).isoformat()}),
        encoding="utf-8",
    )
    return f"Draft {ref} anotado como abordado por {pr_url}."
```

- [ ] **Step 4: Verificar que pasan**

Run: `cd packages/agent && uv run pytest tests/test_tools_backlog.py -v`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/backlog.py packages/agent/tests/test_tools_backlog.py
git commit -m "feat(agent): add AFP-backed friction backlog tools"
```

---

### Task 3: Workspace — allowlist y escritura segura

**Files:**

- Create: `packages/agent/src/tools/workspace.py`
- Test: `packages/agent/tests/test_tools_workspace.py`

- [ ] **Step 1: Escribir tests que fallan**

Crear `packages/agent/tests/test_tools_workspace.py`:

```python
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
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd packages/agent && uv run pytest tests/test_tools_workspace.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.tools.workspace'`

- [ ] **Step 3: Implementar allowlist + escritura**

Crear `packages/agent/src/tools/workspace.py`:

```python
"""Workspace git aislado para el modo self_improve.

El agente NUNCA opera sobre el working tree del host: trabaja en un
clone superficial bajo .generated/workspace/. Toda escritura pasa por
una allowlist dura (escenas custom, skills/prompts del agente,
content/) validada aquí, no en el prompt.
"""
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Optional

import httpx

from ..paths import PROJECT_ROOT

WORKSPACE_DIR = PROJECT_ROOT / ".generated" / "workspace"

WRITE_ALLOWLIST = (
    re.compile(r"^src/compositions/[^/]+/scenes/custom/.+$"),
    re.compile(r"^src/compositions/[^/]+/customSceneRegistry\.ts$"),
    re.compile(r"^packages/agent/skills/.+$"),
    re.compile(r"^packages/agent/prompts/.+$"),
    re.compile(r"^content/.+$"),
)

BRANCH_RE = re.compile(r"^improve/[a-z0-9][a-z0-9._-]*$")

ALLOWLIST_HELP = (
    "Rutas permitidas: src/compositions/*/scenes/custom/, "
    "src/compositions/*/customSceneRegistry.ts, packages/agent/skills/, "
    "packages/agent/prompts/, content/."
)


def _workspace(base_dir: Optional[Path] = None) -> Path:
    return Path(base_dir) if base_dir is not None else WORKSPACE_DIR


def _redact(text: str) -> str:
    token = os.environ.get("GITHUB_TOKEN")
    return text.replace(token, "***") if token else text


def is_path_allowed(rel_path: str) -> bool:
    """True si la ruta relativa cae dentro de la allowlist de escritura."""
    normalized = rel_path.replace("\\", "/")
    if normalized.startswith("/") or ".." in Path(normalized).parts:
        return False
    return any(pattern.match(normalized) for pattern in WRITE_ALLOWLIST)


def _resolve_inside(workspace: Path, rel_path: str) -> Path | None:
    """Resuelve rel_path dentro del workspace; None si escapa (symlinks, ..)."""
    candidate = (workspace / rel_path).resolve()
    try:
        candidate.relative_to(workspace.resolve())
    except ValueError:
        return None
    return candidate


def write_workspace_file(path: str, content: str, base_dir: Optional[Path] = None) -> str:
    """Escribe un archivo en el workspace clonado, sujeto a la allowlist.

    Args:
        path: Ruta relativa a la raíz del repo (p.ej. content/tutorials/x/config.json).
        content: Contenido completo del archivo.
    """
    if not is_path_allowed(path):
        return f"ERROR: '{path}' está fuera de la allowlist de auto-mejora. {ALLOWLIST_HELP}"
    workspace = _workspace(base_dir)
    target = _resolve_inside(workspace, path)
    if target is None:
        return f"ERROR: '{path}' escapa del workspace (symlink o ..)."
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return f"Escrito {path} ({len(content)} chars)."


def read_workspace_file(path: str, base_dir: Optional[Path] = None) -> str:
    """Lee un archivo del workspace clonado (lectura libre, para contexto)."""
    workspace = _workspace(base_dir)
    target = _resolve_inside(workspace, path)
    if target is None or not target.is_file():
        return f"ERROR: no existe '{path}' en el workspace."
    return target.read_text(encoding="utf-8")


def list_workspace_files(pattern: str, base_dir: Optional[Path] = None) -> list[str] | str:
    """Lista archivos del workspace que cumplen un glob (p.ej. 'content/**/*.json')."""
    workspace = _workspace(base_dir)
    if not workspace.is_dir():
        return "ERROR: no hay workspace; llama prepare_workspace primero."
    return sorted(
        str(p.relative_to(workspace))
        for p in workspace.glob(pattern)
        if p.is_file() and ".git/" not in str(p.relative_to(workspace))
    )
```

(Las funciones git y de PR se añaden en las Tasks 4 y 5 a este mismo archivo; los imports `json`, `shutil`, `subprocess` y `httpx` ya quedan listos.)

- [ ] **Step 4: Verificar que pasan**

Run: `cd packages/agent && uv run pytest tests/test_tools_workspace.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/workspace.py packages/agent/tests/test_tools_workspace.py
git commit -m "feat(agent): workspace write tools with hard allowlist"
```

---

### Task 4: Workspace — clone, commit y push

**Files:**

- Modify: `packages/agent/src/tools/workspace.py`
- Test: `packages/agent/tests/test_tools_workspace.py`

- [ ] **Step 1: Escribir tests que fallan**

Añadir a `packages/agent/tests/test_tools_workspace.py`:

```python
import subprocess

from src.tools.workspace import commit_and_push, prepare_workspace


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
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd packages/agent && uv run pytest tests/test_tools_workspace.py -v`
Expected: FAIL — `ImportError: cannot import name 'prepare_workspace'`

- [ ] **Step 3: Implementar**

Añadir a `packages/agent/src/tools/workspace.py`:

```python
def prepare_workspace(repo_url: Optional[str] = None, base_dir: Optional[Path] = None) -> str:
    """Clona (superficial) el repo en .generated/workspace/, limpiando el anterior.

    Sin repo_url usa GITHUB_TOKEN + GITHUB_REPO del entorno. Aislado del
    working tree del host: todo el trabajo de mejora ocurre aquí.
    """
    workspace = _workspace(base_dir)
    if repo_url is None:
        token = os.environ.get("GITHUB_TOKEN")
        repo = os.environ.get("GITHUB_REPO")
        if not token or not repo:
            return "ERROR: faltan GITHUB_TOKEN o GITHUB_REPO en el entorno."
        repo_url = f"https://x-access-token:{token}@github.com/{repo}.git"
    if workspace.exists():
        shutil.rmtree(workspace)
    workspace.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["git", "clone", "--depth", "1", repo_url, str(workspace)],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return f"ERROR: clone falló — {_redact(result.stderr.strip())}"
    for key, value in (("user.name", "claqueta-agent"), ("user.email", "claqueta-agent@users.noreply.github.com")):
        subprocess.run(["git", "-C", str(workspace), "config", key, value], check=True, capture_output=True)
    return f"Workspace listo en {workspace}."


def commit_and_push(branch: str, message: str, base_dir: Optional[Path] = None) -> str:
    """Commitea los cambios del workspace en una rama improve/* y la pushea.

    Rechaza ramas que no sean improve/<slug> y cualquier archivo staged
    fuera de la allowlist (defensa en profundidad sobre write_workspace_file).

    Args:
        branch: Nombre de rama improve/<slug> (minúsculas, dígitos, guiones).
        message: Mensaje de commit en formato Conventional Commits.
    """
    if not BRANCH_RE.match(branch):
        return "ERROR: solo se permiten ramas improve/<slug> (minúsculas, dígitos, ._-). Nunca main."
    workspace = _workspace(base_dir)
    if not (workspace / ".git").exists():
        return "ERROR: no hay workspace; llama prepare_workspace primero."

    def _run(*args: str) -> subprocess.CompletedProcess:
        return subprocess.run(["git", "-C", str(workspace), *args], capture_output=True, text=True)

    _run("checkout", "-B", branch)
    _run("add", "-A")
    staged = [line for line in _run("diff", "--cached", "--name-only").stdout.splitlines() if line]
    if not staged:
        return "ERROR: no hay cambios que commitear."
    blocked = [f for f in staged if not is_path_allowed(f)]
    if blocked:
        _run("reset")
        return f"ERROR: cambios fuera de la allowlist: {', '.join(blocked)}. {ALLOWLIST_HELP}"
    commit = _run("commit", "-m", message)
    if commit.returncode != 0:
        return f"ERROR: commit falló — {_redact(commit.stderr.strip())}"
    push = _run("push", "-u", "origin", branch)
    if push.returncode != 0:
        return f"ERROR: push falló — {_redact(push.stderr.strip())}"
    return f"Rama {branch} pusheada: {message.splitlines()[0]}"
```

- [ ] **Step 4: Verificar que pasan**

Run: `cd packages/agent && uv run pytest tests/test_tools_workspace.py -v`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/workspace.py packages/agent/tests/test_tools_workspace.py
git commit -m "feat(agent): workspace clone, commit and push tools"
```

---

### Task 5: Workspace — open_pull_request (API GitHub, mockeada)

**Files:**

- Modify: `packages/agent/src/tools/workspace.py`
- Test: `packages/agent/tests/test_tools_workspace.py`

- [ ] **Step 1: Escribir tests que fallan**

Añadir a `packages/agent/tests/test_tools_workspace.py`:

```python
import respx
from httpx import Response

from src.tools.workspace import open_pull_request


@respx.mock
def test_open_pull_request_happy_path(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "ghp_test")
    monkeypatch.setenv("GITHUB_REPO", "Vasallo94/Claqueta")
    route = respx.post("https://api.github.com/repos/Vasallo94/Claqueta/pulls").mock(
        return_value=Response(201, json={"html_url": "https://github.com/Vasallo94/Claqueta/pull/42"})
    )
    result = open_pull_request("improve/demo", "feat: demo", "body")
    assert "pull/42" in result
    sent = route.calls.last.request
    assert sent.headers["authorization"] == "Bearer ghp_test"
    import json as _json
    payload = _json.loads(sent.content)
    assert payload == {"title": "feat: demo", "body": "body", "head": "improve/demo", "base": "main"}


@respx.mock
def test_open_pull_request_api_error(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "ghp_test")
    monkeypatch.setenv("GITHUB_REPO", "Vasallo94/Claqueta")
    respx.post("https://api.github.com/repos/Vasallo94/Claqueta/pulls").mock(
        return_value=Response(422, json={"message": "Validation Failed"})
    )
    result = open_pull_request("improve/demo", "t", "b")
    assert result.startswith("ERROR")
    assert "422" in result


def test_open_pull_request_requires_env(monkeypatch):
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.delenv("GITHUB_REPO", raising=False)
    assert open_pull_request("improve/demo", "t", "b").startswith("ERROR")


def test_open_pull_request_rejects_bad_branch(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "ghp_test")
    monkeypatch.setenv("GITHUB_REPO", "Vasallo94/Claqueta")
    assert open_pull_request("main", "t", "b").startswith("ERROR")
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd packages/agent && uv run pytest tests/test_tools_workspace.py -v`
Expected: FAIL — `ImportError: cannot import name 'open_pull_request'`

- [ ] **Step 3: Implementar**

Añadir a `packages/agent/src/tools/workspace.py`:

```python
def open_pull_request(branch: str, title: str, body: str) -> str:
    """Abre un PR en GitHub desde una rama improve/* hacia main.

    Args:
        branch: Rama improve/<slug> ya pusheada.
        title: Título del PR (Conventional Commits).
        body: Descripción: qué fricción resuelve, qué cambió, evidencia (render de muestra si aplica).
    """
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPO")
    if not token or not repo:
        return "ERROR: faltan GITHUB_TOKEN o GITHUB_REPO en el entorno."
    if not BRANCH_RE.match(branch):
        return "ERROR: solo se permiten ramas improve/<slug>."
    try:
        response = httpx.post(
            f"https://api.github.com/repos/{repo}/pulls",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            json={"title": title, "body": body, "head": branch, "base": "main"},
            timeout=30.0,
        )
    except httpx.HTTPError as exc:
        return f"ERROR: la API de GitHub no respondió — {_redact(str(exc))}"
    if response.status_code != 201:
        return f"ERROR: GitHub devolvió {response.status_code}: {response.text[:300]}"
    return f"PR abierto: {response.json()['html_url']}"
```

- [ ] **Step 4: Verificar que pasan**

Run: `cd packages/agent && uv run pytest tests/test_tools_workspace.py -v`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/tools/workspace.py packages/agent/tests/test_tools_workspace.py
git commit -m "feat(agent): open_pull_request tool via GitHub REST API"
```

---

### Task 6: Subagente improver — prompt, skill y registro

**Files:**

- Create: `packages/agent/prompts/improver.md`
- Create: `packages/agent/skills/self-improvement/SKILL.md`
- Create: `packages/agent/src/subagents/improver.py`
- Modify: `packages/agent/src/subagents/__init__.py`
- Modify: `packages/agent/src/orchestrator.py`
- Test: `packages/agent/tests/test_subagents.py`

- [ ] **Step 1: Escribir test que falla**

Añadir a `packages/agent/tests/test_subagents.py` (siguiendo el patrón de los tests existentes del archivo):

```python
def test_improver_definition():
    from src.subagents.improver import create_improver

    agent = create_improver()
    assert agent["name"] == "improver"
    tool_names = {getattr(t, "__name__", getattr(t, "name", "")) for t in agent["tools"]}
    assert {"list_friction_drafts", "read_friction_draft", "mark_draft_addressed"} <= tool_names
    assert {"prepare_workspace", "write_workspace_file", "commit_and_push", "open_pull_request"} <= tool_names
```

- [ ] **Step 2: Verificar que falla**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py -v -k improver`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.subagents.improver'`

- [ ] **Step 3: Crear el prompt**

Crear `packages/agent/prompts/improver.md`:

```markdown
# Improver — auto-mejora de Claqueta

Eres el subagente de auto-mejora de Claqueta. Tu trabajo: convertir fricción
acumulada (drafts AFP) en mejoras concretas del código creativo, entregadas
como pull requests para revisión humana. Lee la skill /skills/self-improvement/SKILL.md
antes de empezar.

## Proceso (en orden, sin saltos)

1. **Lee el backlog**: `list_friction_drafts` y `read_friction_draft` para los
   drafts relevantes. Agrupa fricción relacionada (misma escena, misma skill,
   mismo síntoma).
2. **Prioriza**: `blocked` > `degraded` > `cosmetic`. Varias fricciones con la
   misma causa raíz = un solo tema.
3. **Propón un plan** vía `ask_user_interaction` (checkpoint
   `improvement_plan_approval`): qué drafts abordas, qué archivos tocarás,
   qué cambio harás y cómo lo validarás. Itera hasta aprobación explícita.
   NUNCA toques código antes de la aprobación.
4. **Ejecuta**: `prepare_workspace` → edita con `write_workspace_file`
   (lee contexto con `read_workspace_file` / `list_workspace_files`).
5. **Valida**: si tocaste escenas o configs, renderiza una muestra con
   `submit_render` + `check_render_status`. Si el render falla, NO abras PR:
   repórtalo y deposita fricción con `report_friction`.
6. **Entrega**: `commit_and_push` (rama `improve/<slug>`, mensaje Conventional
   Commits) → `open_pull_request` con descripción completa →
   `mark_draft_addressed` por cada draft abordado → devuelve el link del PR.

## Límites duros

- Solo puedes escribir en: escenas custom, customSceneRegistry.ts,
  packages/agent/skills/, packages/agent/prompts/, content/. La tool te lo
  impedirá fuera de ahí; no lo intentes.
- Un PR = un tema coherente. Fricción no relacionada = otro PR (u otra sesión).
- Si una fricción es ambigua o sospechas agent_misuse en vez de bug real,
  pregunta en el chat en lugar de "arreglar" algo que no está roto.
- El merge es del humano. Tu entregable termina en el link del PR.
```

- [ ] **Step 4: Crear la skill**

Crear `packages/agent/skills/self-improvement/SKILL.md`:

```markdown
---
name: self-improvement
description: Criterios de calidad para sesiones de auto-mejora — cómo convertir drafts AFP en PRs revisables, cuándo renderizar evidencia y cuándo abstenerse.
---

# Self-improvement — criterios de calidad

## Anatomía de un buen PR de auto-mejora

- **Título**: Conventional Commits (`fix(scene): ...`, `docs(skill): ...`).
- **Descripción** con tres secciones obligatorias:
  1. **Fricción origen**: refs de los drafts AFP abordados y resumen del síntoma.
  2. **Cambio**: qué archivos y por qué este enfoque (el mínimo que resuelve la fricción).
  3. **Evidencia**: job id y resultado del render de muestra (si tocaste escenas/configs),
     o por qué no aplica (cambios solo de skills/prompts).

## Cuándo renderizar muestra

- Tocaste cualquier `.tsx` de escena o `customSceneRegistry.ts` → SIEMPRE.
- Tocaste un `config.json` de content/ → SIEMPRE (el config completo).
- Solo skills/prompts del agente → no aplica; dilo en la descripción.

## Cuándo abstenerse

- El draft describe agent_misuse: la mejora correcta suele ser documentación
  (skill/prompt), no código.
- La fricción requiere tocar core (schemas, render-service, web): fuera de tu
  alcance. Dilo en el chat y sugiere que el humano lo aborde; marca el draft
  como fuera de alcance en tu informe final (NO con mark_draft_addressed).
- Dos drafts se contradicen: pregunta antes de elegir bando.

## Tamaño

- ≤ 5 archivos y ≤ ~300 líneas de diff por PR. Más grande = trocea en
  varios PRs/sesiones.
```

- [ ] **Step 5: Crear el subagente**

Crear `packages/agent/src/subagents/improver.py`:

```python
from ..orchestrator import MODEL_PRO, create_model, create_skills_middleware, load_prompt
from ..tools.backlog import list_friction_drafts, mark_draft_addressed, read_friction_draft
from ..tools.friction import report_friction
from ..tools.interactions import ask_user_interaction
from ..tools.render import check_render_status, submit_render
from ..tools.workspace import (
    commit_and_push,
    list_workspace_files,
    open_pull_request,
    prepare_workspace,
    read_workspace_file,
    write_workspace_file,
)


def create_improver() -> dict:
    """Create the Improver SubAgent definition (self_improve mode)."""
    return {
        "name": "improver",
        "description": (
            "Reviews the AFP friction backlog, proposes an improvement plan for "
            "human approval, edits Claqueta's creative code (custom scenes, agent "
            "skills/prompts, content configs) in an isolated git workspace, and "
            "opens GitHub PRs for human review."
        ),
        "system_prompt": load_prompt("improver"),
        "model": create_model(MODEL_PRO),
        "tools": [
            list_friction_drafts,
            read_friction_draft,
            mark_draft_addressed,
            prepare_workspace,
            read_workspace_file,
            list_workspace_files,
            write_workspace_file,
            commit_and_push,
            open_pull_request,
            submit_render,
            check_render_status,
            ask_user_interaction,
            report_friction,
        ],
        "middleware": [create_skills_middleware()],
    }
```

Nota: usa `MODEL_PRO` (no flash) — la auto-mejora es trabajo de criterio, siguiendo el tiering del commit `e9377a7`.

- [ ] **Step 6: Registrar en `__init__.py` y orquestador**

En `packages/agent/src/subagents/__init__.py`, añadir el import y export de `create_improver` siguiendo el patrón de los existentes (p.ej. `from .improver import create_improver` y añadirlo a `__all__` si existe).

En `packages/agent/src/orchestrator.py`:

1. En `create_video_orchestrator`, añadir `create_improver` al import de `.subagents` y `create_improver()` a la lista `subagents`.
2. Añadir `list_friction_drafts` a las tools del orquestador (para el chequeo de umbral post-vídeo), importándola arriba:

```python
from .tools.backlog import list_friction_drafts
```

y en la lista `"tools"` de `kwargs`, después de `report_friction`:

```python
            list_friction_drafts,
```

- [ ] **Step 7: Verificar que pasan los tests**

Run: `cd packages/agent && uv run pytest tests/test_subagents.py tests/test_orchestrator.py -v`
Expected: PASS (incluido `test_improver_definition` y sin regresiones en orchestrator)

- [ ] **Step 8: Commit**

```bash
git add packages/agent/prompts/improver.md packages/agent/skills/self-improvement/ \
        packages/agent/src/subagents/improver.py packages/agent/src/subagents/__init__.py \
        packages/agent/src/orchestrator.py packages/agent/tests/test_subagents.py
git commit -m "feat(agent): improver subagent for self_improve mode"
```

---

### Task 7: Post-mortem y trigger por umbral en el orquestador

**Files:**

- Modify: `packages/agent/prompts/orchestrator.md`

El post-mortem y el trigger son comportamiento del orquestador (prompt), apoyados en tools que ya existen tras las tasks anteriores (`report_friction`, `list_friction_drafts`).

- [ ] **Step 1: Añadir la sección al prompt**

Añadir al final de `packages/agent/prompts/orchestrator.md` (ajustar el nivel de encabezado al del resto del archivo):

```markdown
## Post-mortem y auto-mejora

### Post-mortem (obligatorio al cerrar new_video y revise_existing)

Tras entregar el vídeo final (render OK y pipeline cerrado), haz una pasada
de reflexión ANTES de despedirte:

- ¿Qué paso costó más iteraciones de las esperadas? ¿Por qué?
- ¿Alguna tool, skill, escena o prompt causó confusión, retrabajos o workarounds?
- ¿Hubo validaciones que chocaron entre sí o errores poco claros?

Por cada hallazgo concreto, deposita un field report con `report_friction`
(sé honesto con `fault_domain`; los hallazgos de "lo usé mal" son
`agent_misuse` y también valen — suelen arreglarse con mejor documentación).
Si no hay hallazgos reales, no inventes: cero reports es un resultado válido.

### Trigger por umbral (proponer, nunca iniciar)

Después del post-mortem, llama `list_friction_drafts`. Si
`threshold_reached` es true, informa al usuario: cuántos drafts pendientes
hay, los 2-3 temas más repetidos, y ofrécele iniciar una sesión de mejora
("¿Quieres que revise mi fricción y proponga mejoras?"). NUNCA inicies el
modo self_improve sin que el usuario lo pida explícitamente.

### Modo self_improve

Cuando el usuario pida revisar fricción o mejorar el propio Claqueta
("revisa tu fricción", "mejora tus escenas", "procesa tu backlog"), enruta
con `route_intent("self_improve", ...)` y delega TODO el trabajo en el
subagente `improver`. El checkpoint `improvement_plan_approval` es
obligatorio: el improver presenta su plan y el humano lo aprueba antes de
tocar código. El entregable de la sesión es el link del PR.
```

- [ ] **Step 2: Verificar que los tests de prompts siguen pasando**

Run: `cd packages/agent && uv run pytest tests/test_prompts_filesystem.py tests/test_orchestrator.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/agent/prompts/orchestrator.md
git commit -m "feat(agent): post-mortem and self-improve trigger in orchestrator"
```

---

### Task 8: Infraestructura — Dockerfile, compose y docs de convención

**Files:**

- Modify: `packages/agent/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `docs/agent-io-convention.md`

- [ ] **Step 1: Añadir git al Dockerfile del agente**

En `packages/agent/Dockerfile`, línea del `apt-get install`:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl git && \
    rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 2: Documentar las env nuevas en compose**

En `docker-compose.yml`, servicio `agent`, bloque `environment`, añadir (los valores vienen de `.env` vía `env_file`; aquí solo el default no-secreto):

```yaml
- SELF_IMPROVE_THRESHOLD=${SELF_IMPROVE_THRESHOLD:-5}
- GITHUB_REPO=${GITHUB_REPO:-Vasallo94/Claqueta}
```

(`GITHUB_TOKEN` viaja solo por `.env` / `env_file`; no se declara en el compose para no invitar a hardcodearlo.)

- [ ] **Step 3: Actualizar `docs/agent-io-convention.md`**

Añadir a la tabla **WRITE paths**:

```markdown
| `.generated/workspace/` | Isolated git clone for self_improve sessions (gitignored) |
| `.afp/drafts/*.addressed` | Sidecar marking a friction draft as addressed by a PR |
```

Añadir a la tabla **Environment variables**:

```markdown
| `GITHUB_TOKEN` | — | Fine-grained PAT (contents + pull requests, this repo only) for self_improve |
| `GITHUB_REPO` | `Vasallo94/Claqueta` | owner/repo target for clones and PRs |
| `SELF_IMPROVE_THRESHOLD` | `5` | Pending AFP drafts that make the orchestrator offer an improvement session |
```

- [ ] **Step 4: Verificar que el build de la imagen sigue funcionando**

Run: `docker compose build agent`
Expected: build OK (git instalado; sin otros cambios de capa)

- [ ] **Step 5: Commit**

```bash
git add packages/agent/Dockerfile docker-compose.yml docs/agent-io-convention.md
git commit -m "build(agent): git + self-improve env wiring"
```

---

### Task 9: CI — workflow de PR checks

**Files:**

- Create: `.github/workflows/pr-checks.yml`

La validación lint/typecheck de los PRs del agente (y de cualquier PR) vive en CI; el contenedor del agente no la necesita.

- [ ] **Step 1: Crear el workflow**

Crear `.github/workflows/pr-checks.yml`:

```yaml
name: PR checks

on:
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.1.1
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint

  agent-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/agent
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run pytest tests -v
```

- [ ] **Step 2: Validar la sintaxis localmente**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-checks.yml'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pr-checks.yml
git commit -m "ci: lint and agent tests on pull requests"
```

---

### Task 10: Trazabilidad — CHANGELOG, ADR y cierre de spec

**Files:**

- Modify: `CHANGELOG.md`
- Create: `docs/adr/0016-self-improve-mode.md`
- Modify: `_project_specs/features/2026-06-11-self-improve-mode.md` (marcar criterios)

- [ ] **Step 1: Suite completa en verde**

Run: `cd packages/agent && uv run pytest tests -v && cd ../.. && pnpm run lint`
Expected: PASS todo. Si algo falla, arreglarlo antes de seguir.

- [ ] **Step 2: CHANGELOG**

Añadir bajo `## [Unreleased]` → `### Added` en `CHANGELOG.md`:

```markdown
- **Modo `self_improve`** — el agente revisa su backlog de fricción AFP, propone un plan aprobado por humano y entrega mejoras de su propio código creativo (escenas custom, skills/prompts, configs) como PRs de GitHub: subagente `improver`, tools de backlog (`list_friction_drafts`/`read_friction_draft`/`mark_draft_addressed`), workspace git aislado en `.generated/workspace/` con allowlist dura, post-mortem por vídeo que deposita fricción, trigger por umbral (`SELF_IMPROVE_THRESHOLD`), y CI de PRs (`.github/workflows/pr-checks.yml`)
```

- [ ] **Step 3: ADR 0016**

Crear `docs/adr/0016-self-improve-mode.md` (formato MADR como los ADR existentes):

```markdown
# 0016 — Modo self_improve: auto-mejora vía PRs sobre el propio repo

## Estado

Aceptado — 2026-06-11

## Contexto

Claqueta acumula fricción operativa (drafts AFP de `report_friction`) que
solo se procesaba manualmente. Queremos que el sistema desplegado convierta
esa fricción en mejoras de su propio código creativo, manteniendo el
principio del proyecto: automatizar la ejecución, no el criterio.

## Opciones evaluadas

1. **Modo nuevo en el grafo existente (elegida)** — subagente `improver` +
   contrato `self_improve`; backlog sobre AFP; PRs para revisión humana.
   Riesgo: el agente edita código que define su propio comportamiento →
   mitigado con allowlist dura en código, ramas improve/\*, y merge humano.
2. **Servicio improver separado en el compose** — más aislamiento, pero dos
   cerebros, tooling duplicado e IPC para el trigger desde el chat.
3. **Motor Claude Agent SDK dedicado** — capacidades de ingeniería superiores
   out of the box, pero segunda factura/stack y descartado por el usuario.

## Decisión

Opción 1. Detalles en `docs/superpowers/specs/2026-06-11-self-improve-mode-design.md`.

Decisiones de seguridad clave:

- Allowlist de escritura enforced en `workspace.py` (no en prompt), con
  doble validación en `commit_and_push` sobre los archivos staged.
- Clone superficial aislado en `.generated/workspace/`; nunca el working
  tree del host.
- Ramas solo `improve/*`; push a main rechazado en la tool; merge humano.
- Token fine-grained limitado a contents + pull requests de este repo.
- Lint/typecheck en GitHub Actions, no en el contenedor del agente.

## Consecuencias

- (+) La fricción AFP gana un consumidor automático con criterio humano en
  los dos puntos de control (plan y merge).
- (+) El post-mortem por vídeo alimenta la misma cola — una sola tubería.
- (−) Un PR de skills/prompts mal revisado puede degradar el comportamiento
  futuro del agente: la revisión humana de esos PRs es la última línea.
- (−) El clone superficial por sesión cuesta ancho de banda; aceptable al
  ritmo actual de sesiones.
```

- [ ] **Step 4: Marcar criterios de aceptación cumplidos**

En `_project_specs/features/2026-06-11-self-improve-mode.md`, cambiar `- [ ]` a `- [x]` en cada criterio verificado (todos deberían estarlo salvo el E2E, que requiere sesión manual con la skill `e2e-test`).

- [ ] **Step 5: Commit final**

```bash
git add CHANGELOG.md docs/adr/0016-self-improve-mode.md _project_specs/features/2026-06-11-self-improve-mode.md
git commit -m "docs: changelog, ADR 0016 and spec closure for self_improve"
```

---

## Verificación final (manual, post-implementación)

1. `docker compose up --build` — los 3 servicios healthy.
2. Sembrar un draft: desde el chat, pedir algo que genere fricción o crear un draft de prueba en `.afp/drafts/`.
3. En el chat: "revisa tu fricción" → verificar plan → aprobar → verificar rama `improve/*` y PR en GitHub con descripción completa.
4. Verificar que el PR dispara `pr-checks.yml` y pasa.
5. E2E completo con la skill `e2e-test` (criterio pendiente de la spec).

## Notas para el ejecutor

- `MODEL_PRO`, `create_model`, `create_skills_middleware` y `load_prompt` viven en `src/orchestrator.py` — los subagentes los importan de ahí (patrón de `scene_qa.py`).
- Los tests corren desde `packages/agent/` con `uv run pytest`. `respx` ya está en dev deps.
- Pre-commit corre lint-staged + commitlint: mensajes `type(scope): descripción` ≤ 50 chars.
- El Dockerfile del agente ya incluye Node 22 + pnpm; la Task 8 solo añade `git`.

```

```
