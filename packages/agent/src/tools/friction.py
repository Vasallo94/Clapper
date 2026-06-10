"""report_friction — AFP field reports sobre el propio Claqueta (caso meta).

El LLM que vive en este harness es también su tester de caja negra: cuando una
tool del pipeline, un subagente o el propio orquestador se comporta mal, deja
un "parte de campo" AFP dirigido a los mantenedores de Claqueta.

Regla de oro AFP: el agente deposita SIEMPRE en draft local (.afp/drafts/ en
la raíz del repo). La promoción a issue de GitHub la hace un humano tras
revisar (`afp drafts list/show/promote`). Este módulo no sabe ni puede hacer
otra cosa: no recibe el sink como parámetro a propósito.
"""
from pathlib import Path
from typing import Literal, Optional

from afp.models import FieldReport
from afp.redact import SecretDetected
from afp.sinks import deposit, get_sink
from afp.validate import ReportInvalid, validate_report

from ..paths import PROJECT_ROOT

# Base declarada en el afp.json de la raíz del repo. Los componentes van como
# #fragment para que el anti-spoofing de AFP los reconozca como sub-tools del
# subject poseído (esquema afp: → igualdad tras quitar el fragmento).
SUBJECT_BASE = "afp:app/claqueta/claqueta"

FrictionType = Literal[
    "bug", "undocumented_behavior", "missing_capability",
    "confusing_interface", "wrong_output", "integration_mismatch",
]
FaultDomain = Literal[
    "tool", "agent_misuse", "ambiguous_contract", "environment_issue",
    "permission_denied", "rate_limit", "timeout",
]
Severity = Literal["blocked", "degraded", "cosmetic"]


def report_friction(
    goal: str,
    expectation: str,
    observed: str,
    friction_type: FrictionType,
    fault_domain: FaultDomain,
    severity: Severity,
    component: str = "orchestrator",
    workaround: Optional[str] = None,
    base_dir: Optional[Path] = None,
) -> str:
    """Deja un field report AFP sobre Claqueta como draft local para revisión humana.

    Úsala cuando una tool del pipeline, un subagente o el harness mismo rompa o
    degrade tu plan: bug, comportamiento no documentado, capacidad ausente,
    interfaz confusa, output erróneo. Sé honesto con fault_domain: si tú lo
    usaste mal y la documentación podría haberlo evitado, es agent_misuse.
    No incluyas secretos ni datos personales en el texto libre.

    Args:
        goal: Qué intentabas lograr, en lenguaje de producto.
        expectation: Qué esperabas que hiciera la tool/el harness.
        observed: Qué ocurrió en realidad.
        friction_type: Tipo de fricción (enum cerrado AFP).
        fault_domain: Dónde parece estar la causa (enum cerrado AFP).
        severity: blocked | degraded | cosmetic.
        component: Parte de Claqueta implicada (orchestrator, pipeline, web,
            render-service, o el nombre del subagente/tool concreto).
        workaround: Cómo lo esquivaste, si lo lograste (sugiere el fix).

    Returns:
        Confirmación con la ruta del draft, o "ERROR: ..." si el reporte es
        inválido o contiene secretos (en ese caso no se escribe nada).
    """
    root = Path(base_dir) if base_dir is not None else PROJECT_ROOT
    report = FieldReport.create(
        subject_uri=f"{SUBJECT_BASE}#{component}",
        goal=goal,
        expectation=expectation,
        observed=observed,
        friction_type=friction_type,
        fault_domain=fault_domain,
        severity=severity,
        workaround=workaround,
        harness="claqueta",
        tool_call_name=component,
    ).to_dict()
    try:
        validate_report(report)
    except (ReportInvalid, SecretDetected) as exc:
        return f"ERROR: el field report no se depositó — {exc}"
    sink = get_sink("draft", base_dir=root)
    ref = deposit(sink, report, base_dir=root)
    return (
        f"AFP draft depositado: {ref}. "
        f"AFP-REVIEW: pendiente de revisión humana → afp drafts list --dir {root}"
    )
