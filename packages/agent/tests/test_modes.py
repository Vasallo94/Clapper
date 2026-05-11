from src.modes import get_mode_contract, list_mode_contracts, route_intent


TARGET = {
    "configPath": "content/tutorials/demo/config.json",
    "configId": "demo",
    "jobId": "job-123",
    "composition": "ClaudeCodeTutorial",
    "title": "Demo",
}


def test_router_new_video():
    decision = route_intent("crea un vídeo nuevo sobre git")
    assert decision["mode"] == "new_video"
    assert decision["missing_target"] is False
    assert "copywriter" in decision["agent_scope"]


def test_router_revise_existing_with_target():
    decision = route_intent("mejora el vídeo anterior", TARGET)
    assert decision["mode"] == "revise_existing"
    assert decision["target"] == TARGET
    assert "copywriter" in decision["forbidden_agents"]


def test_router_render_only():
    decision = route_intent("renderiza otra vez", TARGET)
    assert decision["mode"] == "render_only"
    assert decision["can_write_files"] is False
    assert decision["can_render"] is True


def test_router_recover_failed_render():
    decision = route_intent("ha fallado Zod durante el render", TARGET)
    assert decision["mode"] == "recover_failed_render"
    assert decision["can_write_files"] is True


def test_router_audit_only():
    decision = route_intent("qué mejorarías del vídeo?", TARGET)
    assert decision["mode"] == "audit_only"
    assert decision["can_write_files"] is False
    assert decision["can_render"] is False


def test_router_variant():
    decision = route_intent("haz una versión corta", TARGET)
    assert decision["mode"] == "variant"
    assert "variant_plan_checkpoint" in decision["checkpoints"]


def test_router_asset_regeneration():
    decision = route_intent("regenera la voz", TARGET)
    assert decision["mode"] == "asset_regeneration"
    assert decision["can_render"] is False


def test_router_question():
    decision = route_intent("¿cómo funciona el render service?")
    assert decision["mode"] == "question"
    assert decision["agent_scope"] == []


def test_target_required_mode_marks_missing_target():
    decision = route_intent("renderiza otra vez")
    assert decision["mode"] == "render_only"
    assert decision["requires_target"] is True
    assert decision["missing_target"] is True


def test_router_extracts_ui_target_metadata():
    decision = route_intent(
        'mejora el vídeo anterior\n\nACTIVE_VIDEO_TARGET: {"configPath":"content/tutorials/demo/config.json","configId":"demo"}'
    )
    assert decision["mode"] == "revise_existing"
    assert decision["target"]["configPath"] == "content/tutorials/demo/config.json"


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
