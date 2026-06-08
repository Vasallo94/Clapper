def test_scene_creator_tools():
    from src.subagents.scene_creator.tools import read_scene, write_scene

    assert callable(write_scene)
    assert callable(read_scene)


def test_component_id_to_class_name():
    from src.subagents.scene_creator.tools import _component_id_to_class_name

    assert _component_id_to_class_name("block-diagram") == "BlockDiagramScene"
    assert _component_id_to_class_name("code-block") == "CodeBlockScene"
    assert _component_id_to_class_name("timeline") == "TimelineScene"


def test_write_scene_creates_file(tmp_path, monkeypatch):
    from src.subagents.scene_creator import tools

    monkeypatch.setattr(tools, "SCENES_DIR", tmp_path)
    code = "export const TestWidgetScene = () => <div>test</div>"
    result = tools.write_scene("test-widget", code)
    expected_file = tmp_path / "TestWidgetScene.tsx"
    assert expected_file.exists()
    assert expected_file.read_text() == code
    assert "TestWidgetScene.tsx" in result


def test_read_scene_returns_content(tmp_path, monkeypatch):
    from src.subagents.scene_creator import tools

    monkeypatch.setattr(tools, "SCENES_DIR", tmp_path)
    scene_file = tmp_path / "BlockDiagramScene.tsx"
    scene_file.write_text("export const BlockDiagramScene = () => <div />;")
    result = tools.read_scene("block-diagram")
    assert "BlockDiagramScene" in result


def test_read_scene_not_found(tmp_path, monkeypatch):
    from src.subagents.scene_creator import tools

    monkeypatch.setattr(tools, "SCENES_DIR", tmp_path)
    result = tools.read_scene("nonexistent")
    assert "not found" in result


def test_scene_creator_graph_compiles():
    from src.subagents.scene_creator.graph import create_scene_creator_graph

    graph = create_scene_creator_graph()
    assert graph is not None


def test_scene_creator_definition():
    from src.subagents.scene_creator.graph import create_scene_creator

    defn = create_scene_creator()
    assert defn["name"] == "scene_creator"
    assert "graph" in defn
    assert "tools" in defn
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "write_scene" in tool_names
    assert "read_scene" in tool_names
    assert "present_custom_scene" in tool_names
    assert len(defn["tools"]) == 6
