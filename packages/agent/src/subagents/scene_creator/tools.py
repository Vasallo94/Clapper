from ...paths import CUSTOM_SCENES_DIR as SCENES_DIR


def _component_id_to_class_name(component_id: str) -> str:
    """Convert kebab-case to PascalCase + 'Scene'. E.g. 'block-diagram' -> 'BlockDiagramScene'."""
    parts = component_id.split("-")
    return "".join(p.capitalize() for p in parts) + "Scene"


def write_scene(component_id: str, code: str) -> str:
    """Write a custom scene component .tsx file.

    Args:
        component_id: Kebab-case component identifier (e.g. 'data-table').
        code: Full TypeScript/React source code for the component.
    """
    class_name = _component_id_to_class_name(component_id)
    file_path = SCENES_DIR / f"{class_name}.tsx"
    file_path.write_text(code, encoding="utf-8")
    return f"Written {class_name}.tsx to {file_path}"


def read_scene(component_id: str) -> str:
    """Read an existing custom scene component as reference.

    Args:
        component_id: Kebab-case component identifier (e.g. 'block-diagram').
    """
    class_name = _component_id_to_class_name(component_id)
    file_path = SCENES_DIR / f"{class_name}.tsx"
    if not file_path.exists():
        return f"Scene '{component_id}' not found at {file_path}"
    return file_path.read_text(encoding="utf-8")
