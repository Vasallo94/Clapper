import inspect


def test_present_custom_scene_uses_interrupt():
    from src.tools.scene import present_custom_scene

    source = inspect.getsource(present_custom_scene)
    assert "interrupt(" in source


def test_present_custom_scene_approved(monkeypatch):
    import src.tools._checkpoint as cp_mod
    monkeypatch.setattr(cp_mod, "interrupt", lambda v: {"approved": True})
    from src.tools.scene import present_custom_scene

    result = present_custom_scene("my-widget", "export const MyWidgetScene = () => <div>test</div>")
    assert "APPROVED" in result


def test_present_custom_scene_feedback(monkeypatch):
    import src.tools._checkpoint as cp_mod
    monkeypatch.setattr(cp_mod, "interrupt", lambda v: {"approved": False, "feedback": "Add animation"})
    from src.tools.scene import present_custom_scene

    result = present_custom_scene("my-widget", "export const MyWidgetScene = () => <div>test</div>")
    assert "CHANGES REQUESTED" in result
    assert "Add animation" in result
