"""Tests de report_friction: el caso meta de AFP — el LLM que vive en el
harness Claqueta deja field reports sobre el propio Claqueta.

Contrato:
- Deposita SIEMPRE como draft local (.afp/drafts/ en la raíz del repo);
  la promoción a issue es decisión humana, nunca del agente.
- El subject usa la base del manifiesto afp.json con el componente como
  #fragment, de modo que el anti-spoofing de AFP lo reconozca como propio.
- Secretos detectados abortan el depósito sin escribir nada.
"""
import json
from pathlib import Path

from src.tools.friction import SUBJECT_BASE, report_friction


def _report(tmp_path: Path, **overrides):
    kwargs = {
        "goal": "renderizar la escena 3 del tutorial",
        "expectation": "submit_render devuelve un job id",
        "observed": "devolvió un objeto vacío sin error",
        "friction_type": "wrong_output",
        "fault_domain": "tool",
        "severity": "degraded",
        "component": "render-service",
        "base_dir": tmp_path,
    }
    kwargs.update(overrides)
    return report_friction(**kwargs)


def test_deposits_draft_in_base_dir(tmp_path):
    result = _report(tmp_path)
    drafts = list((tmp_path / ".afp" / "drafts").glob("*.json"))
    assert len(drafts) == 1
    data = json.loads(drafts[0].read_text())
    assert data["subject_uri"] == f"{SUBJECT_BASE}#render-service"
    assert data["harness"] == "claqueta"
    assert "AFP-REVIEW" in result


def test_subject_falls_under_manifest_subject(tmp_path):
    """El subject generado debe caer bajo el del afp.json del repo (anti-spoofing)."""
    from afp.sinks import subject_is_owned_by

    _report(tmp_path, component="orchestrator")
    draft = next((tmp_path / ".afp" / "drafts").glob("*.json"))
    subject = json.loads(draft.read_text())["subject_uri"]
    manifest = json.loads((Path(__file__).parents[3] / "afp.json").read_text())
    assert subject_is_owned_by(subject, manifest["subject_uri"])


def test_invalid_enum_returns_error_without_writing(tmp_path):
    result = _report(tmp_path, friction_type="annoying")
    assert result.startswith("ERROR")
    assert not (tmp_path / ".afp").exists()


def test_secret_blocks_deposit(tmp_path):
    result = _report(tmp_path, observed="falló con el token sk-abcdefghijklmnopqrstuvwx")
    assert result.startswith("ERROR")
    assert "secret" in result.lower() or "secreto" in result.lower()
    assert not (tmp_path / ".afp").exists()
