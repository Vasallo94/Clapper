import json


def test_query_scene_catalog_lists_templates():
    from src.tools.catalog import query_scene_catalog

    result = query_scene_catalog("template")
    parsed = json.loads(result)
    assert any(t["templateId"] == "tutorial-code-walkthrough" for t in parsed["templates"])


def test_query_scene_catalog_finds_template_by_id():
    from src.tools.catalog import query_scene_catalog

    result = query_scene_catalog("tutorial-code-walkthrough")
    parsed = json.loads(result)
    assert parsed["templates"][0]["templateId"] == "tutorial-code-walkthrough"
    assert parsed["templates"][0]["steps"]


def test_query_scene_catalog_finds_scene_metadata():
    from src.tools.catalog import query_scene_catalog

    result = query_scene_catalog("terminal")
    parsed = json.loads(result)
    scene_ids = {scene.get("type") or scene.get("componentId") for scene in parsed["scenes"]}
    assert "terminal" in scene_ids
    terminal = next(scene for scene in parsed["scenes"] if scene.get("type") == "terminal")
    assert "demo" in terminal["narrativeRoles"]
    assert terminal["recommendedBeats"] == 3
