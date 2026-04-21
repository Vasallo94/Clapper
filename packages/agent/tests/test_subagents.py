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
    assert "list_audio_library" in tool_names
    assert "copy_library_track" in tool_names
    assert len(defn["tools"]) == 2


def test_present_sound_chart_uses_interrupt():
    from src.tools.sound import present_sound_chart

    source = inspect.getsource(present_sound_chart)
    assert "interrupt(" in source


def test_audio_planner_definition():
    from src.subagents.audio_planner import create_audio_planner

    defn = create_audio_planner()
    assert defn["name"] == "audio_planner"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_audio_chart" in tool_names
    assert "list_audio_library" in tool_names
    assert len(defn["tools"]) == 2


def test_audio_planner_exported():
    from src.subagents import create_audio_planner

    assert callable(create_audio_planner)


def test_voice_generator_definition():
    from src.subagents.voice_generator import create_voice_generator

    defn = create_voice_generator()
    assert defn["name"] == "voice_generator"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "generate_voiceover" in tool_names
    assert len(defn["tools"]) == 1


def test_voice_generator_exported():
    from src.subagents import create_voice_generator

    assert callable(create_voice_generator)
