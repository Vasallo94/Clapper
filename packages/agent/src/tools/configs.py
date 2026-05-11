from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from langgraph.types import interrupt

from ._checkpoint import checkpoint_interrupt
from ..paths import PROJECT_ROOT

CONFIG_ROOTS = ("content/tutorials", "content/shorts", "content/presentations")


def _safe_project_path(path_or_slug: str) -> Path:
    candidate = Path(path_or_slug)
    if not candidate.is_absolute():
        candidate = PROJECT_ROOT / candidate
    resolved = candidate.resolve()
    root = PROJECT_ROOT.resolve()
    if resolved != root and root not in resolved.parents:
        raise ValueError(f"Path is outside project root: {path_or_slug}")
    return resolved


def _iter_config_paths() -> list[Path]:
    paths: list[Path] = []
    for root in CONFIG_ROOTS:
        base = PROJECT_ROOT / root
        if base.exists():
            paths.extend(base.glob("*/config.json"))
    generated = PROJECT_ROOT / ".generated" / "renders"
    if generated.exists():
        paths.extend(generated.glob("*/config.json"))
    return sorted(set(paths))


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _summarize_config(path: Path) -> dict[str, Any]:
    config = _load_json(path)
    rel = path.relative_to(PROJECT_ROOT).as_posix()
    return {
        "configPath": rel,
        "configId": config.get("id") or path.parent.name,
        "composition": config.get("composition", "ClaudeCodeTutorial"),
        "title": config.get("title") or config.get("headline") or config.get("product") or path.parent.name,
        "sceneCount": len(config.get("scenes", [])) if isinstance(config.get("scenes"), list) else 0,
        "durationSeconds": sum(float(scene.get("durationInSeconds", 0) or 0) for scene in config.get("scenes", []) if isinstance(scene, dict)),
    }


def _resolve_config_path(path_or_slug: str) -> Path:
    direct = _safe_project_path(path_or_slug)
    if direct.is_file():
        return direct
    if direct.is_dir() and (direct / "config.json").is_file():
        return direct / "config.json"

    slug = Path(path_or_slug).name
    matches: list[Path] = []
    for path in _iter_config_paths():
        try:
            config = _load_json(path)
        except (OSError, json.JSONDecodeError):
            continue
        if path.parent.name == slug or config.get("id") == slug or str(config.get("title", "")).lower() == slug.lower():
            matches.append(path)
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        options = ", ".join(p.relative_to(PROJECT_ROOT).as_posix() for p in matches)
        raise ValueError(f"Multiple configs match '{path_or_slug}': {options}")
    raise FileNotFoundError(f"No config found for '{path_or_slug}'")


def list_video_configs() -> dict[str, Any]:
    """List known video config candidates from content folders and generated renders."""
    configs: list[dict[str, Any]] = []
    for path in _iter_config_paths():
        try:
            configs.append(_summarize_config(path))
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            configs.append({"configPath": path.relative_to(PROJECT_ROOT).as_posix(), "error": str(exc)})
    return {"configs": configs}


def load_video_config(path_or_slug: str) -> dict[str, Any]:
    """Load a video config by relative path, absolute project path, directory, slug, or config id."""
    path = _resolve_config_path(path_or_slug)
    config = _load_json(path)
    return {
        "sourcePath": path.relative_to(PROJECT_ROOT).as_posix(),
        "config": config,
        "content": json.dumps(config, ensure_ascii=False, indent=2),
        "summary": _summarize_config(path),
    }


def stage_existing_config(path_or_slug: str) -> dict[str, Any]:
    """Prepare an existing config for `/pipeline/config.json`.

    The tool returns the JSON content. The orchestrator must write that content to
    `/pipeline/config.json` with the built-in `write_file` tool before dispatching
    mode-specific subagents.
    """
    loaded = load_video_config(path_or_slug)
    return {
        **loaded,
        "pipelinePath": "/pipeline/config.json",
        "instruction": "Write `content` to /pipeline/config.json before dispatching mode-specific agents.",
    }


def save_pipeline_config_to_source(source_path: str, config_json: str) -> dict[str, Any]:
    """Persist a staged `/pipeline/config.json` JSON string back to its source path."""
    path = _resolve_config_path(source_path)
    config = json.loads(config_json)
    backup = path.with_suffix(".json.bak")
    shutil.copyfile(path, backup)
    path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {
        "saved": True,
        "sourcePath": path.relative_to(PROJECT_ROOT).as_posix(),
        "backupPath": backup.relative_to(PROJECT_ROOT).as_posix(),
        "configId": config.get("id"),
    }


def present_revision_plan(
    target: dict[str, Any],
    requested_changes: list[str],
    proposed_edits: list[str],
    will_render: bool = False,
) -> str:
    """Present a revision plan before changing an existing video config."""
    return checkpoint_interrupt(
        {
            "type": "revision_plan_checkpoint",
            "target": target,
            "requestedChanges": requested_changes,
            "proposedEdits": proposed_edits,
            "willRender": will_render,
        },
        "The user approved the revision plan. Apply only the approved minimal patch.",
        "Revise the plan and call present_revision_plan again.",
    )


def present_variant_plan(
    source: dict[str, Any],
    variant: dict[str, Any],
    proposed_changes: list[str],
    will_render: bool = False,
) -> str:
    """Present a variant plan before creating a derived config."""
    return checkpoint_interrupt(
        {
            "type": "variant_plan_checkpoint",
            "source": source,
            "variant": variant,
            "proposedChanges": proposed_changes,
            "willRender": will_render,
        },
        "The user approved the variant plan. Create a new config with derivedFrom metadata.",
        "Revise the variant plan and call present_variant_plan again.",
    )


def present_target_selection(mode: str, candidates: list[dict[str, Any]]) -> str:
    """Ask the user to select a target config when a target-required mode lacks one."""
    decision = interrupt(
        {
            "type": "target_selection_checkpoint",
            "mode": mode,
            "candidates": candidates,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        target = decision.get("target")
        if isinstance(target, dict):
            return f"APPROVED — selected target: {json.dumps(target, ensure_ascii=False)}. Stage that config before continuing."
        return "APPROVED — The user selected a target. Stage that config before continuing."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — {feedback}. Ask the user for a target config before continuing."
