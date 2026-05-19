from src.modes import get_mode_contract, list_mode_contracts, route_intent


TARGET = {
    "configPath": "content/tutorials/demo/config.json",
    "configId": "demo",
    "jobId": "job-123",
    "composition": "ClaudeCodeTutorial",
    "title": "Demo",
}


def test_route_intent_returns_contract_for_mode():
    decision = route_intent("new_video", "crea un vídeo nuevo sobre git")
    assert decision["mode"] == "new_video"
    assert decision["missing_target"] is False
    assert "copywriter" in decision["agent_scope"]
    assert decision["can_write_files"] is True
    assert decision["can_render"] is True


def test_route_intent_with_target():
    decision = route_intent("revise_existing", "mejora el vídeo anterior", active_target=TARGET)
    assert decision["mode"] == "revise_existing"
    assert decision["target"] == TARGET
    assert "copywriter" in decision["forbidden_agents"]


def test_route_intent_marks_missing_target():
    decision = route_intent("render_only", "renderiza otra vez")
    assert decision["requires_target"] is True
    assert decision["missing_target"] is True


def test_route_intent_render_only():
    decision = route_intent("render_only", "renderiza", active_target=TARGET)
    assert decision["mode"] == "render_only"
    assert decision["can_write_files"] is False
    assert decision["can_render"] is True


def test_route_intent_question():
    decision = route_intent("question", "puedes mostrarme este vídeo?")
    assert decision["mode"] == "question"
    assert decision["agent_scope"] == []
    assert decision["can_write_files"] is False
    assert decision["can_render"] is False


def test_route_intent_extracts_ui_target_metadata():
    decision = route_intent(
        "revise_existing",
        'mejora el vídeo\n\nACTIVE_VIDEO_TARGET: {"configPath":"content/tutorials/demo/config.json","configId":"demo"}',
    )
    assert decision["target"]["configPath"] == "content/tutorials/demo/config.json"
    assert decision["missing_target"] is False


def test_route_intent_rationale():
    decision = route_intent("question", "hola", rationale="User is just greeting")
    assert decision["rationale"] == "User is just greeting"


def test_route_intent_unknown_mode():
    result = route_intent("nonexistent_mode", "test")
    assert "error" in result


def test_route_intent_variant():
    decision = route_intent("variant", "haz una versión corta", active_target=TARGET)
    assert decision["mode"] == "variant"
    assert "variant_plan_checkpoint" in decision["checkpoints"]


def test_route_intent_audit():
    decision = route_intent("audit_only", "analiza el vídeo", active_target=TARGET)
    assert decision["can_write_files"] is False
    assert decision["can_render"] is False


def test_contracts_enforce_mode_prohibitions():
    contracts = list_mode_contracts()
    assert contracts["revise_existing"]["requires_target"] is True
    assert "copywriter" in contracts["revise_existing"]["forbidden_agents"]
    assert contracts["render_only"]["can_write_files"] is False
    assert contracts["audit_only"]["can_write_files"] is False
    assert contracts["audit_only"]["can_render"] is False
    assert "derivedFrom" in " ".join(contracts["variant"]["rules"])


def test_get_mode_contract():
    contract = get_mode_contract("asset_regeneration")
    assert contract["mode"] == "asset_regeneration"
    assert "voice_generator" in contract["allowed_agents"]
