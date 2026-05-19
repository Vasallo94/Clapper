from __future__ import annotations

import json
from typing import Any, Literal

from langgraph.types import interrupt

InteractionKind = Literal["text", "single_choice", "multi_choice", "approval"]
InteractionIntent = Literal["clarification", "creative_choice", "approval", "onboarding", "explanation"]


def _normalize_options(options: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    if not options:
        return []

    normalized: list[dict[str, Any]] = []
    for index, option in enumerate(options):
        label = str(option.get("label") or option.get("value") or "").strip()
        if not label:
            continue
        value = str(option.get("value") or label)
        normalized.append(
            {
                "id": str(option.get("id") or value.lower().replace(" ", "_") or f"option_{index + 1}"),
                "label": label,
                "value": value,
                "description": str(option.get("description") or "").strip(),
            }
        )
    return normalized


def ask_user_interaction(
    title: str,
    body: str = "",
    input_kind: InteractionKind = "text",
    options: list[dict[str, Any]] | None = None,
    source_agent: str = "orchestrator",
    intent: InteractionIntent = "clarification",
    placeholder: str = "",
    required: bool = True,
    min_selections: int = 0,
    max_selections: int | None = None,
    approve_label: str = "Aprobar",
    reject_label: str = "Pedir cambios",
) -> str:
    """Ask the user for lightweight structured input during a creative workflow.

    Use this for onboarding, blocking clarifications, and low-cost creative choices
    that do not deserve a rich escaleta/direction/audio card.

    Args:
        title: Short visible prompt title.
        body: Optional explanatory body.
        input_kind: One of text, single_choice, multi_choice, approval.
        options: Choice options for single_choice or multi_choice. Each option may
            include id, label, value, and description.
        source_agent: Agent requesting the interaction.
        intent: Why the interaction is needed.
        placeholder: Placeholder for text responses.
        required: Whether the UI should require input before resuming.
        min_selections: Minimum selected options for multi_choice.
        max_selections: Optional maximum selected options for multi_choice.
        approve_label: Button label for approval interactions.
        reject_label: Button label for approval/change-request interactions.

    Returns:
        A structured JSON string with the user's response. Continue the workflow
        according to that answer.
    """
    normalized_options = _normalize_options(options)
    if input_kind in ("single_choice", "multi_choice") and not normalized_options:
        raise ValueError(f"{input_kind} interactions require at least one option")

    input_payload: dict[str, Any] = {
        "kind": input_kind,
        "required": required,
    }
    if placeholder:
        input_payload["placeholder"] = placeholder
    if input_kind in ("single_choice", "multi_choice"):
        input_payload["options"] = normalized_options
    if input_kind == "multi_choice":
        input_payload["min"] = min_selections
        if max_selections is not None:
            input_payload["max"] = max_selections
    if input_kind == "approval":
        input_payload["approveLabel"] = approve_label
        input_payload["rejectLabel"] = reject_label

    decision = interrupt(
        {
            "type": "interaction_request",
            "sourceAgent": source_agent,
            "intent": intent,
            "title": title,
            "body": body,
            "input": input_payload,
        }
    )

    return "USER_RESPONSE -- " + json.dumps(decision, ensure_ascii=False)
