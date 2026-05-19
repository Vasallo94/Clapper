import inspect


def test_researcher_definition():
    from src.subagents.researcher import create_researcher

    defn = create_researcher()
    assert defn["name"] == "researcher"
    assert "description" in defn
    assert "system_prompt" in defn
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
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_direction" in tool_names
    assert "audit_content_quality" in tool_names


def test_director_uses_pro_model():
    from src.subagents.director import create_director

    defn = create_director()
    assert defn.get("model") is not None


def test_copywriter_definition():
    from src.subagents.copywriter import create_copywriter

    defn = create_copywriter()
    assert defn["name"] == "copywriter"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_escaleta" in tool_names
    assert "query_scene_catalog" in tool_names


def test_copywriter_uses_pro_model():
    from src.subagents.copywriter import create_copywriter

    defn = create_copywriter()
    assert defn.get("model") is not None


def test_sound_engineer_definition():
    from src.subagents.sound_engineer import create_sound_engineer

    defn = create_sound_engineer()
    assert defn["name"] == "sound_engineer"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "list_audio_library" in tool_names
    assert "copy_library_track" in tool_names


def test_sound_engineer_uses_flash_model():
    from src.subagents.sound_engineer import create_sound_engineer

    defn = create_sound_engineer()
    assert defn.get("model") is not None


def test_audio_planner_definition():
    from src.subagents.audio_planner import create_audio_planner

    defn = create_audio_planner()
    assert defn["name"] == "audio_planner"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_audio_chart" in tool_names
    assert "list_audio_library" in tool_names


def test_audio_planner_uses_flash_model():
    from src.subagents.audio_planner import create_audio_planner

    defn = create_audio_planner()
    assert defn.get("model") is not None


def test_audio_planner_exported():
    from src.subagents import create_audio_planner

    assert callable(create_audio_planner)


def test_voice_generator_definition():
    from src.subagents.voice_generator import create_voice_generator

    defn = create_voice_generator()
    assert defn["name"] == "voice_generator"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "generate_voiceover" in tool_names


def test_voice_generator_uses_flash_model():
    from src.subagents.voice_generator import create_voice_generator

    defn = create_voice_generator()
    assert defn.get("model") is not None


def test_voice_generator_exported():
    from src.subagents import create_voice_generator

    assert callable(create_voice_generator)


def test_validator_definition():
    from src.subagents.validator import create_validator

    defn = create_validator()
    assert defn["name"] == "validator"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "validate_config" in tool_names
    assert "audit_content_quality" in tool_names


def test_validator_uses_flash_model():
    from src.subagents.validator import create_validator

    defn = create_validator()
    assert defn.get("model") is not None


def test_reviewer_definition():
    from src.subagents.reviewer import create_reviewer

    defn = create_reviewer()
    assert defn["name"] == "reviewer"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "review_render" in tool_names


def test_reviewer_uses_flash_model():
    from src.subagents.reviewer import create_reviewer

    defn = create_reviewer()
    assert defn.get("model") is not None


def test_validator_exported():
    from src.subagents import create_validator

    assert callable(create_validator)


def test_reviewer_exported():
    from src.subagents import create_reviewer

    assert callable(create_reviewer)


def test_scene_qa_definition():
    from src.subagents.scene_qa import create_scene_qa

    defn = create_scene_qa()
    assert defn["name"] == "scene_qa"
    assert "description" in defn
    assert "system_prompt" in defn
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "render_scene_stills" in tool_names
    assert "qa_scenes" in tool_names
    assert "present_qa_report" in tool_names


def test_scene_qa_uses_flash_model():
    from src.subagents.scene_qa import create_scene_qa

    defn = create_scene_qa()
    assert defn.get("model") is not None


def test_scene_qa_exported():
    from src.subagents import create_scene_qa

    assert callable(create_scene_qa)
