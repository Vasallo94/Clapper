"""Config sanitizer for LLM-generated video configs.

Normalizes common mistakes from Gemini/LLM output to match the Remotion Zod
schemas before submission.  The function is deterministic and side-effect free
(except logging).
"""

import copy
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── lookup tables ────────────────────────────────────────────────────────────

EMPHASIS_HIGH = {"strong", "alta", "high-emphasis"}
EMPHASIS_MEDIUM = {"normal", "standard", "mid", "moderate"}
EMPHASIS_LOW = {"subtle", "weak", "baja", "light"}
EMPHASIS_VALID = {"low", "medium", "high"}

DURATION_LIMITS: dict[str, tuple[int, int]] = {
    "intro": (1, 30),
    "terminal": (2, 120),
    "callout": (1, 15),
    "outro": (2, 20),
    "custom": (1, 120),
    "hero": (1, 30),
    "benefits": (2, 30),
    "pricing": (1, 15),
    "cta": (1, 15),
}
DEFAULT_DURATION_LIMITS = (1, 120)

CALLOUT_VALID_POSITIONS = {"top", "center", "bottom", "right"}
CALLOUT_TO_CENTER = {"left", "izquierda", "middle", "medio"}

MAX_TRANSITION_MS = 1500


# ── helpers ──────────────────────────────────────────────────────────────────


def _normalize_emphasis(value: Any) -> tuple[str | None, str | None]:
    """Return (normalized_value, mutation_description_or_None)."""
    if value is None:
        return None, None
    if not isinstance(value, str):
        return "medium", f"non-string emphasis {value!r} -> 'medium'"
    low = value.lower().strip()
    if low in EMPHASIS_VALID:
        return low, None  # already valid
    if low in EMPHASIS_HIGH:
        return "high", f"emphasis '{value}' -> 'high'"
    if low in EMPHASIS_MEDIUM:
        return "medium", f"emphasis '{value}' -> 'medium'"
    if low in EMPHASIS_LOW:
        return "low", f"emphasis '{value}' -> 'low'"
    return "medium", f"emphasis '{value}' -> 'medium' (unknown value)"


# ── main entry point ─────────────────────────────────────────────────────────


def sanitize_config(config: dict) -> tuple[dict, list[str]]:
    """Sanitize an LLM-generated config to match Remotion Zod schemas.

    Returns a deep copy of *config* with normalizations applied, plus a list of
    human-readable strings describing every mutation.
    """
    cfg = copy.deepcopy(config)
    mutations: list[str] = []

    scenes = cfg.get("scenes")
    if not isinstance(scenes, list):
        return cfg, mutations

    for idx, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            continue

        scene_type = scene.get("type", "")
        prefix = f"scene[{idx}]"

        # ── A) Emphasis normalization on beats ────────────────────────────
        beats = scene.get("beats")
        if isinstance(beats, list):
            for beat in beats:
                if not isinstance(beat, dict):
                    continue
                raw = beat.get("emphasis")
                if raw is not None:
                    norm, msg = _normalize_emphasis(raw)
                    if msg:
                        beat["emphasis"] = norm
                        mutations.append(f"{prefix} beat: {msg}")

        # ── B) Terminal scene lines ───────────────────────────────────────
        if scene_type == "terminal":
            _sanitize_terminal_lines(scene, prefix, mutations)

        # ── C) Duration clamping ──────────────────────────────────────────
        dur = scene.get("durationInSeconds")
        if isinstance(dur, (int, float)):
            lo, hi = DURATION_LIMITS.get(scene_type, DEFAULT_DURATION_LIMITS)
            clamped = max(lo, min(hi, dur))
            if clamped != dur:
                scene["durationInSeconds"] = clamped
                mutations.append(f"{prefix} durationInSeconds {dur} clamped to {clamped} (limits {lo}-{hi})")

        # ── D) Callout position ───────────────────────────────────────────
        if scene_type == "callout":
            pos = scene.get("position")
            if isinstance(pos, str) and pos not in CALLOUT_VALID_POSITIONS:
                low_pos = pos.lower().strip()
                if low_pos in CALLOUT_TO_CENTER:
                    scene["position"] = "center"
                    mutations.append(f"{prefix} position '{pos}' -> 'center'")
                elif low_pos not in CALLOUT_VALID_POSITIONS:
                    scene["position"] = "center"
                    mutations.append(f"{prefix} position '{pos}' -> 'center' (invalid)")

        # ── E) Benefits items ─────────────────────────────────────────────
        if scene_type == "benefits":
            items = scene.get("items")
            if isinstance(items, list):
                converted = False
                new_items = []
                for item in items:
                    if isinstance(item, str):
                        new_items.append({"text": item})
                        converted = True
                    else:
                        new_items.append(item)
                if converted:
                    scene["items"] = new_items
                    mutations.append(f"{prefix} benefits items: bare strings wrapped as {{text: ...}}")

        # ── F) Timing transitionMs ────────────────────────────────────────
        timing = scene.get("timing")
        if isinstance(timing, dict):
            trans = timing.get("transitionMs")
            if isinstance(trans, (int, float)) and trans > MAX_TRANSITION_MS:
                timing["transitionMs"] = MAX_TRANSITION_MS
                mutations.append(f"{prefix} timing.transitionMs {trans} clamped to {MAX_TRANSITION_MS}")

        # ── G) Strip beats with invalid startMs ──────────────────────────
        dur_s = scene.get("durationInSeconds")
        if isinstance(beats, list) and isinstance(dur_s, (int, float)) and dur_s > 0:
            max_ms = dur_s * 1000
            valid_beats = []
            for beat in beats:
                if not isinstance(beat, dict):
                    valid_beats.append(beat)
                    continue
                start = beat.get("startMs")
                if isinstance(start, (int, float)) and start >= max_ms:
                    beat_id = beat.get("id", "?")
                    mutations.append(
                        f"{prefix} beat '{beat_id}' removed: startMs {start} >= scene duration {dur_s}s"
                    )
                else:
                    valid_beats.append(beat)
            if len(valid_beats) != len(beats):
                scene["beats"] = valid_beats

    # ── H) voiceover.enabled must be literal True ─────────────────────────
    vo = cfg.get("voiceover")
    if isinstance(vo, dict):
        raw_enabled = vo.get("enabled")
        if raw_enabled is not True:
            coerced = str(raw_enabled).lower().strip() in ("true", "1", "yes", "sí", "si")
            if coerced or raw_enabled is not None:
                vo["enabled"] = True
                mutations.append(f"voiceover.enabled {raw_enabled!r} -> True")

    # ── I) soundDesign.enabled coerce to boolean ─────────────────────────
    sd = cfg.get("soundDesign")
    if isinstance(sd, dict) and "enabled" in sd:
        raw_sd_enabled = sd["enabled"]
        if not isinstance(raw_sd_enabled, bool):
            sd["enabled"] = str(raw_sd_enabled).lower().strip() in ("true", "1", "yes", "sí", "si")
            mutations.append(f"soundDesign.enabled {raw_sd_enabled!r} -> {sd['enabled']}")

    # ── A-bis) Emphasis on soundDesign.sfx[].beatEmphasis ────────────────
    sfx_list = cfg.get("soundDesign", {}).get("sfx") if isinstance(cfg.get("soundDesign"), dict) else None
    if isinstance(sfx_list, list):
        for sfx in sfx_list:
            if not isinstance(sfx, dict):
                continue
            raw = sfx.get("beatEmphasis")
            if raw is not None:
                norm, msg = _normalize_emphasis(raw)
                if msg:
                    sfx["beatEmphasis"] = norm
                    sfx_id = sfx.get("id", "?")
                    mutations.append(f"soundDesign.sfx[{sfx_id}] beatEmphasis: {msg}")

    return cfg, mutations


def _sanitize_terminal_lines(scene: dict, prefix: str, mutations: list[str]) -> None:
    """Normalize terminal scene line formats in place."""
    lines = scene.get("lines")
    output = scene.get("output")
    commands = scene.get("commands")

    # Convert `output` list[str] -> lines
    if isinstance(output, list) and all(isinstance(s, str) for s in output):
        new_lines = [{"kind": "output", "text": s} for s in output]
        if isinstance(lines, list):
            lines.extend(new_lines)
            scene["lines"] = lines
        else:
            scene["lines"] = new_lines
        del scene["output"]
        mutations.append(f"{prefix} terminal: converted output[] to lines[]")
        lines = scene["lines"]

    # Convert `commands` list[str] -> prepend to lines
    if isinstance(commands, list) and all(isinstance(s, str) for s in commands):
        cmd_lines = [{"kind": "command", "text": s} for s in commands]
        existing = scene.get("lines", [])
        if isinstance(existing, list):
            scene["lines"] = cmd_lines + existing
        else:
            scene["lines"] = cmd_lines
        del scene["commands"]
        mutations.append(f"{prefix} terminal: converted commands[] to lines[]")
        lines = scene["lines"]

    # Wrap bare strings in lines[]
    if isinstance(lines, list):
        wrapped = False
        new_lines = []
        for item in lines:
            if isinstance(item, str):
                new_lines.append({"kind": "output", "text": item})
                wrapped = True
            else:
                new_lines.append(item)
        if wrapped:
            scene["lines"] = new_lines
            mutations.append(f"{prefix} terminal: wrapped bare string lines as {{kind: output}}")
