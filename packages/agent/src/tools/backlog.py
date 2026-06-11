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
