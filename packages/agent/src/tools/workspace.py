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
