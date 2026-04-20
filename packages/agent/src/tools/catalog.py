import json
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent.parent.parent / "src" / "shared" / "scene-catalog.json"


def query_scene_catalog(query: str = "") -> str:
    """Query the scene catalog for available scene types and their props.

    Args:
        query: Optional search term to filter scenes. Empty returns all.
    """
    if not CATALOG_PATH.exists():
        return "Scene catalog not found. Run npm run generate:catalog first."

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

    if not query:
        custom = catalog["scenes"]["tutorial"]["custom"]
        builtin_tutorial = catalog["scenes"]["tutorial"]["builtin"]
        builtin_short = catalog["scenes"]["productShort"]["builtin"]
        lines = [
            f"Tutorial builtin scenes: {', '.join(builtin_tutorial)}",
            f"Product Short builtin scenes: {', '.join(builtin_short)}",
            f"Custom scenes ({len(custom)} available):",
        ]
        for scene in custom:
            lines.append(f"  - {scene['componentId']}: {scene['description']}")
        return "\n".join(lines)

    custom = catalog["scenes"]["tutorial"]["custom"]
    matches = [s for s in custom if query.lower() in s["componentId"].lower()]
    if not matches:
        return f"No scenes matching '{query}'. Use query_scene_catalog() to see all."
    return json.dumps(matches, indent=2)
