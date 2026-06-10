"""Unit tests for the 5 agent tools.

These tests do not touch Modal, OpenAI, or the network. They assert that each
tool returns the EditorGraphAction shape the editor expects, that ids are
stable strings, and that argument validation rejects bad input.
"""

from __future__ import annotations

import re

import pytest
from pydantic import ValidationError as PydanticValidationError

from agents.tools import (
    GraphState,
    add_node,
    add_pipe,
    delete_node,
    update_node,
    validate,
)


def _state() -> GraphState:
    return GraphState(system_id="sys_test")


def test_add_node_returns_editor_action_shape() -> None:
    state = _state()
    result = add_node(
        state,
        system_id="sys_test",
        type="Agent",
        title="Planner",
        description="Plans the work.",
        x=240,
        y=180,
    )
    assert result["action"] == "addNode"
    assert result["systemId"] == "sys_test"
    assert result["type"] == "Agent"
    assert result["title"] == "Planner"
    assert result["description"] == "Plans the work."
    assert result["x"] == 240
    assert result["y"] == 180
    assert isinstance(result["clientNodeId"], str)
    assert re.match(r"^tmp_[0-9a-f]{8}$", result["clientNodeId"])
    assert result["clientNodeId"] in state.nodes


def test_add_node_omits_optional_fields_when_absent() -> None:
    state = _state()
    result = add_node(state, system_id="sys_test", type="Agent", title="Coder")
    assert "description" not in result
    assert "x" not in result
    assert "y" not in result


def test_add_node_rejects_overlong_title() -> None:
    state = _state()
    with pytest.raises(PydanticValidationError):
        add_node(state, system_id="sys_test", type="Agent", title="x" * 81)


def test_add_pipe_returns_editor_action_shape() -> None:
    state = _state()
    a = add_node(state, system_id="sys_test", type="Agent", title="A")
    b = add_node(state, system_id="sys_test", type="Agent", title="B")
    result = add_pipe(
        state,
        system_id="sys_test",
        from_node_id=a["clientNodeId"],
        to_node_id=b["clientNodeId"],
    )
    assert result["action"] == "addPipe"
    assert result["fromNodeId"] == a["clientNodeId"]
    assert result["toNodeId"] == b["clientNodeId"]
    assert re.match(r"^tmp_[0-9a-f]{8}$", result["clientPipeId"])


def test_update_node_returns_editor_action_shape() -> None:
    state = _state()
    n = add_node(state, system_id="sys_test", type="Agent", title="Original")
    nid = n["clientNodeId"]
    result = update_node(
        state,
        node_id=nid,
        title="Renamed",
        position={"x": 460, "y": 180},
    )
    assert result["action"] == "updateNode"
    assert result["nodeId"] == nid
    assert result["title"] == "Renamed"
    assert result["position"] == {"x": 460, "y": 180}
    # State reflects the patch.
    assert state.nodes[nid]["title"] == "Renamed"


def test_delete_node_cascades_to_attached_pipes() -> None:
    state = _state()
    a = add_node(state, system_id="sys_test", type="Agent", title="A")
    b = add_node(state, system_id="sys_test", type="Agent", title="B")
    p = add_pipe(
        state,
        system_id="sys_test",
        from_node_id=a["clientNodeId"],
        to_node_id=b["clientNodeId"],
    )
    result = delete_node(state, node_id=a["clientNodeId"])
    assert result["action"] == "deleteNode"
    assert result["nodeId"] == a["clientNodeId"]
    assert a["clientNodeId"] not in state.nodes
    # Pipe was cascaded.
    assert p["clientPipeId"] not in state.pipes


def test_validate_clean_graph_returns_ok() -> None:
    state = _state()
    a = add_node(state, system_id="sys_test", type="Agent", title="A")
    b = add_node(state, system_id="sys_test", type="Agent", title="B")
    add_pipe(
        state,
        system_id="sys_test",
        from_node_id=a["clientNodeId"],
        to_node_id=b["clientNodeId"],
    )
    result = validate(state, system_id="sys_test")
    assert result == {"ok": True, "errors": []}


def test_validate_dangling_pipe_returns_error() -> None:
    state = _state()
    state.pipes["tmp_dangling"] = {
        "systemId": "sys_test",
        "fromNodeId": "missing_a",
        "toNodeId": "missing_b",
    }
    result = validate(state, system_id="sys_test")
    assert result["ok"] is False
    assert len(result["errors"]) == 2
    assert all("pipeId" in err for err in result["errors"])


def test_validate_self_loop_returns_error() -> None:
    state = _state()
    n = add_node(state, system_id="sys_test", type="Loop", title="Self")
    nid = n["clientNodeId"]
    state.pipes["tmp_self"] = {
        "systemId": "sys_test",
        "fromNodeId": nid,
        "toNodeId": nid,
    }
    result = validate(state, system_id="sys_test")
    assert result["ok"] is False
    messages = [e["message"] for e in result["errors"]]
    assert any("itself" in m for m in messages)


def test_ids_are_unique_across_calls() -> None:
    state = _state()
    ids = {add_node(state, system_id="sys_test", type="Agent", title=f"N{i}")["clientNodeId"] for i in range(20)}
    assert len(ids) == 20


def test_add_pipe_rejects_missing_required_args() -> None:
    state = _state()
    with pytest.raises(TypeError):
        add_pipe(state, system_id="sys_test", from_node_id="x")  # type: ignore[call-arg]


def test_update_node_rejects_overlong_title() -> None:
    state = _state()
    n = add_node(state, system_id="sys_test", type="Agent", title="A")
    with pytest.raises(PydanticValidationError):
        update_node(state, node_id=n["clientNodeId"], title="x" * 81)
