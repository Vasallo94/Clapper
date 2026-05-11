from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Literal, TypedDict

ModeName = Literal[
    "new_video",
    "revise_existing",
    "render_only",
    "recover_failed_render",
    "audit_only",
    "variant",
    "asset_regeneration",
    "question",
]


class ActiveVideoTarget(TypedDict, total=False):
    configPath: str
    configId: str
    jobId: str
    composition: str
    title: str


@dataclass(frozen=True)
class ModeContract:
    mode: ModeName
    description: str
    requires_target: bool
    can_write_files: bool
    can_render: bool
    allowed_agents: tuple[str, ...]
    forbidden_agents: tuple[str, ...] = ()
    checkpoints: tuple[str, ...] = ()
    rules: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class IntentDecision:
    mode: ModeName
    confidence: float
    requires_target: bool
    target: ActiveVideoTarget | None
    agent_scope: tuple[str, ...]
    requires_checkpoint: bool
    can_write_files: bool
    can_render: bool
    rationale: str
    missing_target: bool = False
    forbidden_agents: tuple[str, ...] = field(default_factory=tuple)
    checkpoints: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict:
        data = asdict(self)
        data["agent_scope"] = list(self.agent_scope)
        data["forbidden_agents"] = list(self.forbidden_agents)
        data["checkpoints"] = list(self.checkpoints)
        return data


MODE_CONTRACTS: dict[ModeName, ModeContract] = {
    "new_video": ModeContract(
        mode="new_video",
        description="Create a new video config and optionally render it through the full creative pipeline.",
        requires_target=False,
        can_write_files=True,
        can_render=True,
        allowed_agents=(
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
        checkpoints=(
            "escaleta_checkpoint",
            "direction_checkpoint",
            "audio_chart_checkpoint",
            "validation_report",
            "review_checkpoint",
        ),
        rules=(
            "Use the existing full pipeline.",
            'Default theme is "linea-directa" unless the user explicitly requests another theme.',
            "Do not write config.json until the escaleta has explicit human approval.",
        ),
    ),
    "revise_existing": ModeContract(
        mode="revise_existing",
        description="Patch an existing config with the smallest change that satisfies the user request.",
        requires_target=True,
        can_write_files=True,
        can_render=True,
        allowed_agents=("director", "audio_planner", "voice_generator", "sound_engineer", "scene_creator", "validator", "reviewer"),
        forbidden_agents=("researcher", "copywriter"),
        checkpoints=("revision_plan_checkpoint", "direction_checkpoint", "audio_chart_checkpoint", "validation_report"),
        rules=(
            "Load and stage the target config before dispatching agents.",
            "Present a revision plan and wait for approval before modifying files.",
            "Preserve id, composition, and scene structure unless the user explicitly asks to change them.",
            "Never create a new config when the user asked to revise an existing one.",
        ),
    ),
    "render_only": ModeContract(
        mode="render_only",
        description="Validate and render an existing config without changing content.",
        requires_target=True,
        can_write_files=False,
        can_render=True,
        allowed_agents=("validator", "reviewer"),
        forbidden_agents=("researcher", "copywriter", "director", "audio_planner", "voice_generator", "sound_engineer", "scene_creator"),
        checkpoints=("validation_report",),
        rules=(
            "Do not modify config, assets, copy, direction, or audio.",
            "If validation fails, stop and suggest recover_failed_render instead of patching automatically.",
        ),
    ),
    "recover_failed_render": ModeContract(
        mode="recover_failed_render",
        description="Fix concrete validation or render failures in an existing config.",
        requires_target=True,
        can_write_files=True,
        can_render=True,
        allowed_agents=("scene_creator", "validator", "reviewer"),
        forbidden_agents=("researcher", "copywriter"),
        checkpoints=("revision_plan_checkpoint", "validation_report"),
        rules=(
            "Only touch fields or assets needed to unblock validation/render.",
            "Do not rewrite the creative concept, scene order, or copy unless required by the error.",
        ),
    ),
    "audit_only": ModeContract(
        mode="audit_only",
        description="Analyze a target config or topic and answer with recommendations only.",
        requires_target=True,
        can_write_files=False,
        can_render=False,
        allowed_agents=("validator", "reviewer"),
        forbidden_agents=(
            "researcher",
            "copywriter",
            "director",
            "audio_planner",
            "voice_generator",
            "sound_engineer",
            "scene_creator",
        ),
        checkpoints=(),
        rules=("Do not write files, generate assets, or render.", "Return findings and proposed improvements only."),
    ),
    "variant": ModeContract(
        mode="variant",
        description="Create a new config derived from an existing one.",
        requires_target=True,
        can_write_files=True,
        can_render=True,
        allowed_agents=("director", "audio_planner", "voice_generator", "sound_engineer", "scene_creator", "validator", "reviewer"),
        forbidden_agents=("researcher",),
        checkpoints=("variant_plan_checkpoint", "direction_checkpoint", "audio_chart_checkpoint", "validation_report"),
        rules=(
            "Never overwrite the source config.",
            "Create a new config with a new id and derivedFrom pointing at the source id/path.",
            "Present a variant plan and wait for approval before creating files.",
        ),
    ),
    "asset_regeneration": ModeContract(
        mode="asset_regeneration",
        description="Regenerate or copy only voiceover, music, SFX, or media assets for an existing config.",
        requires_target=True,
        can_write_files=True,
        can_render=False,
        allowed_agents=("audio_planner", "voice_generator", "sound_engineer", "validator"),
        forbidden_agents=("researcher", "copywriter", "director", "scene_creator", "reviewer"),
        checkpoints=("audio_chart_checkpoint", "validation_report"),
        rules=(
            "Do not change scene copy, timing, composition, or config identity unless required for asset paths.",
            "Limit work to the requested asset category.",
        ),
    ),
    "question": ModeContract(
        mode="question",
        description="Answer directly without dispatching creative or production agents.",
        requires_target=False,
        can_write_files=False,
        can_render=False,
        allowed_agents=(),
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
        rules=("Answer the question directly.", "Do not call render, validation, or file-writing tools."),
    ),
}


QUESTION_PATTERNS = (
    r"\b(qué|que|cu[aá]l|como|c[oó]mo|por qu[eé]|d[oó]nde|cuando|cu[aá]ndo)\b.*\?",
    r"^\s*(expl[ií]came|dime|ay[uú]dame a entender|tengo una pregunta)\b",
)
NEW_VIDEO_PATTERNS = (
    r"\b(crea|crear|genera|generar|haz|hacer|produce|producir|nuevo|nueva)\b.*\b(v[ií]deo|video|short|tutorial|demo)\b",
    r"\b(v[ií]deo|video|short|tutorial|demo)\b.*\b(nuevo|nueva|desde cero)\b",
)
REVISE_PATTERNS = (
    r"\b(mejora|mejorar|ajusta|ajustar|corrige|corregir|cambia|cambiar|edita|editar|revisa|revisar|actualiza|actualizar)\b",
    r"\b(v[ií]deo anterior|video anterior|este v[ií]deo|este video|la versi[oó]n actual)\b",
)
RENDER_PATTERNS = (
    r"\b(renderiza|renderizar|rerender|vuelve a renderizar|exporta|exportar)\b",
    r"\b(otra vez|de nuevo)\b.*\b(render|renderiza|exporta)\b",
)
RECOVER_PATTERNS = (
    r"\b(error|fall[oó]|falla|failed|zod|schema|validaci[oó]n|render roto|no renderiza|stderr)\b",
    r"\b(arregla|repara|desbloquea)\b.*\b(render|validaci[oó]n|zod|schema)\b",
)
AUDIT_PATTERNS = (
    r"\b(qu[eé] mejorar[ií]as|audita|auditar|analiza|analizar|review|revisi[oó]n|opin[ií]on|diagn[oó]stico)\b",
    r"\b(sin tocar|sin cambiar|solo mirar|solo analizar)\b",
)
VARIANT_PATTERNS = (
    r"\b(versi[oó]n|variante|deriva|duplic[aá]|adapta)\b",
    r"\b(m[aá]s corto|m[aá]s larga|vertical|horizontal|linkedin|tiktok|short)\b",
)
ASSET_PATTERNS = (
    r"\b(regenera|regenerar|vuelve a generar|recrea|recrear|copia|copiar)\b.*\b(voz|voiceover|audio|m[uú]sica|sfx|sonido|asset|assets)\b",
    r"\b(voz|voiceover|audio|m[uú]sica|sfx|sonido|asset|assets)\b.*\b(regenera|regenerar|copia|copiar)\b",
)


def get_mode_contract(mode: ModeName) -> dict:
    """Return the contract for a video-orchestrator mode."""
    return MODE_CONTRACTS[mode].to_dict()


def list_mode_contracts() -> dict:
    """Return all available mode contracts keyed by mode name."""
    return {mode: contract.to_dict() for mode, contract in MODE_CONTRACTS.items()}


def route_intent(user_request: str, active_target: ActiveVideoTarget | None = None) -> dict:
    """Classify a user request into a mode contract decision.

    Args:
        user_request: Latest user message, optionally including UI target metadata.
        active_target: Optional selected video artifact from the UI.
    """
    request = user_request.strip()
    normalized = request.lower()
    parsed_target = active_target or _extract_target_from_request(request)

    mode, confidence, rationale = _classify(normalized, bool(parsed_target))
    contract = MODE_CONTRACTS[mode]
    missing_target = contract.requires_target and not parsed_target

    decision = IntentDecision(
        mode=mode,
        confidence=confidence,
        requires_target=contract.requires_target,
        target=parsed_target,
        agent_scope=contract.allowed_agents,
        requires_checkpoint=bool(contract.checkpoints),
        can_write_files=contract.can_write_files,
        can_render=contract.can_render,
        rationale=rationale,
        missing_target=missing_target,
        forbidden_agents=contract.forbidden_agents,
        checkpoints=contract.checkpoints,
    )
    return decision.to_dict()


def _classify(normalized: str, has_target: bool) -> tuple[ModeName, float, str]:
    if _matches(normalized, RECOVER_PATTERNS):
        return "recover_failed_render", 0.9, "The request mentions a concrete validation/render failure."

    if _matches(normalized, ASSET_PATTERNS):
        return "asset_regeneration", 0.88, "The request is limited to voiceover, music, SFX, or asset regeneration."

    if _matches(normalized, RENDER_PATTERNS):
        return "render_only", 0.86, "The request asks to render/export again."

    if _matches(normalized, AUDIT_PATTERNS):
        return "audit_only", 0.84, "The request asks for analysis or recommendations without implementation."

    if has_target and _matches(normalized, VARIANT_PATTERNS):
        return "variant", 0.82, "The request asks for a derived version of an existing target."

    if has_target and _matches(normalized, REVISE_PATTERNS):
        return "revise_existing", 0.82, "The request asks to modify the active video target."

    if _matches(normalized, NEW_VIDEO_PATTERNS):
        return "new_video", 0.84, "The request asks to create a new video."

    if _matches(normalized, QUESTION_PATTERNS):
        return "question", 0.74, "The request is phrased as a question."

    if has_target and _matches(normalized, REVISE_PATTERNS + VARIANT_PATTERNS):
        return "revise_existing", 0.68, "The request refers to an existing active target."

    return "question", 0.58, "No production intent was detected; answer directly."


def _matches(value: str, patterns: tuple[str, ...]) -> bool:
    return any(re.search(pattern, value, flags=re.IGNORECASE) for pattern in patterns)


def _extract_target_from_request(request: str) -> ActiveVideoTarget | None:
    marker = "ACTIVE_VIDEO_TARGET:"
    if marker not in request:
        return None

    raw = request.split(marker, 1)[1].strip()
    if not raw:
        return None

    import json

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None

    if not isinstance(data, dict):
        return None

    target: ActiveVideoTarget = {}
    for key in ("configPath", "configId", "jobId", "composition", "title"):
        value = data.get(key)
        if isinstance(value, str) and value:
            target[key] = value
    return target or None
