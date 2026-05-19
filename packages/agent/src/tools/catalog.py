import json

from ..paths import SCENE_CATALOG as CATALOG_PATH


def _scene_id(scene: dict) -> str:
    return scene.get("componentId") or scene.get("type", "")


def _scene_line(scene: dict) -> str:
    scene_id = _scene_id(scene)
    roles = ", ".join(scene.get("narrativeRoles", []))
    duration = scene.get("durationRange", [])
    duration_text = f"{duration[0]}-{duration[1]}s" if len(duration) == 2 else "duration n/a"
    return f"  - {scene_id}: {scene.get('description', '')} Roles: {roles}. Duration: {duration_text}."


def _template_line(template: dict) -> str:
    arc = " -> ".join(template.get("narrativeArc", []))
    duration = template.get("targetDurationSeconds", [])
    duration_text = f"{duration[0]}-{duration[1]}s" if len(duration) == 2 else "duration n/a"
    return f"  - {template['templateId']}: {template.get('description', '')} Arc: {arc}. Target: {duration_text}."


def _searchable_text(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False).lower()


def query_scene_catalog(query: str = "") -> str:
    """Query the scene catalog for available scene types, narrative metadata, and templates.

    Args:
        query: Optional search term to filter scenes/templates. Empty returns all.
    """
    if not CATALOG_PATH.exists():
        return "Scene catalog not found. Run npm run generate:catalog first."

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    tutorial_builtin = catalog["scenes"]["tutorial"]["builtin"]
    custom = catalog["scenes"]["tutorial"]["custom"]
    short_builtin = catalog["scenes"]["productShort"]["builtin"]
    templates = catalog.get("templates", [])

    if not query:
        lines = [
            "Video templates:",
        ]
        for template in templates:
            lines.append(_template_line(template))
        lines.extend([
            "Tutorial builtin scenes:",
            *[_scene_line(scene) for scene in tutorial_builtin],
            "Product Short builtin scenes:",
            *[_scene_line(scene) for scene in short_builtin],
            f"Custom scenes ({len(custom)} available):",
        ])
        for scene in custom:
            lines.append(_scene_line(scene))
        return "\n".join(lines)

    query_l = query.lower()
    all_scenes = tutorial_builtin + custom + short_builtin
    scene_matches = [s for s in all_scenes if query_l in _searchable_text(s)]
    template_matches = [t for t in templates if query_l in _searchable_text(t)]
    matches = {"templates": template_matches, "scenes": scene_matches}
    if query_l in {"template", "templates", "plantilla", "plantillas"}:
        matches = {"templates": templates, "scenes": []}

    if not matches["templates"] and not matches["scenes"]:
        return f"No scenes or templates matching '{query}'. Use query_scene_catalog() to see all."

    return json.dumps(matches, indent=2, ensure_ascii=False)
