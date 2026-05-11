"""Tests for config sanitizer."""

import copy

import pytest

from src.tools._sanitize import sanitize_config


def _base_config(**overrides):
    cfg = {
        "id": "test-video",
        "fps": 30,
        "width": 1280,
        "height": 720,
        "theme": "linea-directa",
        "title": "Test",
        "description": "A test video",
        "scenes": [],
    }
    cfg.update(overrides)
    return cfg


class TestEmphasisNormalization:
    def test_strong_maps_to_high(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [{"id": "b1", "startMs": 0, "emphasis": "strong"}],
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["beats"][0]["emphasis"] == "high"
        assert any("'strong' -> 'high'" in m for m in mutations)

    def test_normal_maps_to_medium(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [{"id": "b1", "startMs": 0, "emphasis": "normal"}],
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["beats"][0]["emphasis"] == "medium"

    def test_subtle_maps_to_low(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [{"id": "b1", "startMs": 0, "emphasis": "subtle"}],
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["beats"][0]["emphasis"] == "low"

    def test_unknown_value_defaults_to_medium(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [{"id": "b1", "startMs": 0, "emphasis": "super-strong"}],
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["beats"][0]["emphasis"] == "medium"
        assert any("unknown value" in m for m in mutations)

    def test_valid_emphasis_unchanged(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [{"id": "b1", "startMs": 0, "emphasis": "high"}],
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["beats"][0]["emphasis"] == "high"
        assert not mutations

    def test_null_emphasis_unchanged(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [{"id": "b1", "startMs": 0, "emphasis": None}],
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["beats"][0]["emphasis"] is None
        assert not mutations

    def test_spanish_aliases(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [
                {"id": "b1", "startMs": 0, "emphasis": "alta"},
                {"id": "b2", "startMs": 1000, "emphasis": "baja"},
            ],
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["beats"][0]["emphasis"] == "high"
        assert result["scenes"][0]["beats"][1]["emphasis"] == "low"
        assert len(mutations) == 2

    def test_sfx_beat_emphasis(self):
        cfg = _base_config(
            scenes=[{"type": "intro", "title": "Hi", "durationInSeconds": 5}],
            soundDesign={"sfx": [{"id": "click", "beatEmphasis": "strong"}]},
        )
        result, mutations = sanitize_config(cfg)
        assert result["soundDesign"]["sfx"][0]["beatEmphasis"] == "high"


class TestTerminalLines:
    def test_output_array_to_lines(self):
        cfg = _base_config(scenes=[{
            "type": "terminal",
            "output": ["line 1", "line 2"],
            "durationInSeconds": 10,
        }])
        result, mutations = sanitize_config(cfg)
        scene = result["scenes"][0]
        assert "output" not in scene
        assert scene["lines"] == [
            {"kind": "output", "text": "line 1"},
            {"kind": "output", "text": "line 2"},
        ]
        assert any("converted output[]" in m for m in mutations)

    def test_commands_array_prepended(self):
        cfg = _base_config(scenes=[{
            "type": "terminal",
            "commands": ["git init"],
            "lines": [{"kind": "output", "text": "Initialized..."}],
            "durationInSeconds": 10,
        }])
        result, mutations = sanitize_config(cfg)
        scene = result["scenes"][0]
        assert "commands" not in scene
        assert scene["lines"][0] == {"kind": "command", "text": "git init"}
        assert scene["lines"][1] == {"kind": "output", "text": "Initialized..."}

    def test_bare_strings_in_lines_wrapped(self):
        cfg = _base_config(scenes=[{
            "type": "terminal",
            "lines": ["some output", {"kind": "command", "text": "ls"}],
            "durationInSeconds": 10,
        }])
        result, mutations = sanitize_config(cfg)
        scene = result["scenes"][0]
        assert scene["lines"][0] == {"kind": "output", "text": "some output"}
        assert scene["lines"][1] == {"kind": "command", "text": "ls"}

    def test_valid_lines_unchanged(self):
        lines = [{"kind": "command", "text": "echo hi"}, {"kind": "output", "text": "hi"}]
        cfg = _base_config(scenes=[{
            "type": "terminal",
            "lines": lines,
            "durationInSeconds": 10,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["lines"] == lines
        assert not mutations


class TestDurationClamping:
    def test_callout_clamped_to_15(self):
        cfg = _base_config(scenes=[{
            "type": "callout",
            "text": "Important",
            "position": "center",
            "durationInSeconds": 25,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["durationInSeconds"] == 15
        assert any("clamped to 15" in m for m in mutations)

    def test_cta_clamped_to_15(self):
        cfg = _base_config(scenes=[{
            "type": "cta",
            "text": "Buy now",
            "durationInSeconds": 20,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["durationInSeconds"] == 15

    def test_terminal_min_2(self):
        cfg = _base_config(scenes=[{
            "type": "terminal",
            "lines": [{"kind": "command", "text": "ls"}],
            "durationInSeconds": 1,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["durationInSeconds"] == 2

    def test_valid_duration_unchanged(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 10,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["durationInSeconds"] == 10
        assert not mutations


class TestCalloutPosition:
    def test_left_to_center(self):
        cfg = _base_config(scenes=[{
            "type": "callout",
            "text": "Note",
            "position": "left",
            "durationInSeconds": 5,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["position"] == "center"

    def test_middle_to_center(self):
        cfg = _base_config(scenes=[{
            "type": "callout",
            "text": "Note",
            "position": "middle",
            "durationInSeconds": 5,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["position"] == "center"

    def test_valid_position_unchanged(self):
        for pos in ("top", "center", "bottom", "right"):
            cfg = _base_config(scenes=[{
                "type": "callout",
                "text": "Note",
                "position": pos,
                "durationInSeconds": 5,
            }])
            result, mutations = sanitize_config(cfg)
            assert result["scenes"][0]["position"] == pos
            assert not mutations


class TestBenefitsItems:
    def test_string_items_wrapped(self):
        cfg = _base_config(scenes=[{
            "type": "benefits",
            "items": ["Fast", "Reliable"],
            "durationInSeconds": 10,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["items"] == [{"text": "Fast"}, {"text": "Reliable"}]

    def test_object_items_unchanged(self):
        items = [{"text": "Fast"}, {"text": "Reliable"}]
        cfg = _base_config(scenes=[{
            "type": "benefits",
            "items": items,
            "durationInSeconds": 10,
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["items"] == items
        assert not mutations


class TestTimingTransitionMs:
    def test_transition_clamped_to_1500(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "timing": {"transitionMs": 3000},
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["timing"]["transitionMs"] == 1500

    def test_valid_transition_unchanged(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "timing": {"transitionMs": 300},
        }])
        result, mutations = sanitize_config(cfg)
        assert result["scenes"][0]["timing"]["transitionMs"] == 300
        assert not mutations


class TestInvalidBeats:
    def test_beat_past_duration_removed(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [
                {"id": "ok", "startMs": 1000},
                {"id": "bad", "startMs": 6000},
            ],
        }])
        result, mutations = sanitize_config(cfg)
        assert len(result["scenes"][0]["beats"]) == 1
        assert result["scenes"][0]["beats"][0]["id"] == "ok"
        assert any("removed" in m for m in mutations)


class TestNoOpOnValidConfig:
    def test_fully_valid_config_unchanged(self):
        cfg = _base_config(scenes=[
            {
                "type": "intro",
                "title": "Hello",
                "durationInSeconds": 8,
                "timing": {"leadInMs": 500, "transitionMs": 300},
                "beats": [{"id": "b1", "startMs": 500, "emphasis": "high"}],
            },
            {
                "type": "terminal",
                "lines": [{"kind": "command", "text": "echo hi"}, {"kind": "output", "text": "hi"}],
                "durationInSeconds": 15,
            },
            {
                "type": "callout",
                "text": "Important",
                "position": "center",
                "durationInSeconds": 8,
            },
            {
                "type": "benefits",
                "items": [{"text": "Fast"}, {"text": "Reliable"}],
                "durationInSeconds": 12,
            },
            {
                "type": "cta",
                "text": "Get started",
                "durationInSeconds": 6,
            },
        ])
        original = copy.deepcopy(cfg)
        result, mutations = sanitize_config(cfg)
        assert result == original
        assert mutations == []

    def test_original_config_not_mutated(self):
        cfg = _base_config(scenes=[{
            "type": "intro",
            "title": "Hi",
            "durationInSeconds": 5,
            "beats": [{"id": "b1", "startMs": 0, "emphasis": "strong"}],
        }])
        original = copy.deepcopy(cfg)
        sanitize_config(cfg)
        assert cfg == original
