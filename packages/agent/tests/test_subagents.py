import inspect


def test_researcher_definition():
    from src.subagents.researcher import create_researcher

    defn = create_researcher()
    assert defn["name"] == "researcher"
    assert "description" in defn
    assert "system_prompt" in defn
    assert len(defn["tools"]) == 3
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "web_search" in tool_names
    assert "web_fetch" in tool_names
    assert "scrape_product" in tool_names


def test_researcher_uses_flash_model():
    from src.subagents.researcher import create_researcher

    defn = create_researcher()
    assert defn.get("model") is not None


def test_director_definition():
    from src.subagents.director import create_director

    defn = create_director()
    assert defn["name"] == "director"
    assert defn["tools"] == []
    assert "system_prompt" in defn


def test_copywriter_definition():
    from src.subagents.copywriter import create_copywriter

    defn = create_copywriter()
    assert defn["name"] == "copywriter"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_escaleta" in tool_names
    assert "query_scene_catalog" in tool_names


def test_sound_engineer_definition():
    from src.subagents.sound_engineer import create_sound_engineer

    defn = create_sound_engineer()
    assert defn["name"] == "sound_engineer"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_sound_chart" in tool_names
    assert "generate_audio" in tool_names
    assert "list_audio_library" in tool_names


def test_present_sound_chart_uses_interrupt():
    from src.tools.sound import present_sound_chart

    source = inspect.getsource(present_sound_chart)
    assert "interrupt(" in source
