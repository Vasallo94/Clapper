import pytest


def test_ask_user_interaction_emits_structured_payload(monkeypatch):
    from src.tools import interactions

    captured = {}

    def fake_interrupt(payload):
        captured["payload"] = payload
        return {"approved": True, "selectedValue": "demo"}

    monkeypatch.setattr(interactions, "interrupt", fake_interrupt)

    result = interactions.ask_user_interaction(
        title="Elige enfoque",
        body="Necesito una preferencia creativa.",
        input_kind="single_choice",
        options=[{"id": "demo", "label": "Demo practica", "value": "demo"}],
        intent="creative_choice",
    )

    assert result.startswith("USER_RESPONSE")
    assert captured["payload"]["type"] == "interaction_request"
    assert captured["payload"]["title"] == "Elige enfoque"
    assert captured["payload"]["input"]["kind"] == "single_choice"
    assert captured["payload"]["input"]["options"][0]["value"] == "demo"


def test_choice_interaction_requires_options():
    from src.tools.interactions import ask_user_interaction

    with pytest.raises(ValueError, match="single_choice interactions require"):
        ask_user_interaction(title="Elige", input_kind="single_choice")
