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
