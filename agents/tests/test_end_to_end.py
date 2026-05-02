"""End-to-end test of the plan-first flow, eval gates, and cancellation.

These tests stub the model with a deterministic planner + runner and assert:
  * The streamed events arrive in the exact order required by
    docs/agent-contract.md (status thinking -> message plan -> status calling_tool
    -> tool_call -> tool_result -> ... -> message final -> done).
  * Conversation_id and turn_id round-trip on the `done` event.
  * Cancellation: setting an abort signal mid-stream halts further events.
  * The plan eval gate rejects banned-word plans.
  * The action eval gate rejects self-loop pipes.
  * A no-op plan emits `done` cleanly with zero tool calls.
  * The placeholder substitution renders the prompt cleanly with empty context.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator

import pytest

from agents.builder import render_system_prompt, run_turn_stream
from agents.plan_evaluator import evaluate_action, evaluate_plan
from agents.schemas import BuildRequest


GOOD_PLAN = (
    "Build a planner-coder loop that hands off code generation. "
    "Add a Planner agent and a Coder agent. "
    "Connect them with a pipe carrying the plan from Planner to Coder. "
    "Two nodes earn their place because the engineer asked for a planner-coder loop."
)


def _parse_frames(frames: list[str]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for frame in frames:
        lines = frame.strip().split("\n")
        event_name = ""
        data_str = ""
        for line in lines:
            if line.startswith("event: "):
                event_name = line[len("event: "):]
            elif line.startswith("data: "):
                data_str = line[len("data: "):]
        out.append({"event": event_name, "data": json.loads(data_str)})
    return out


async def _consume(stream: AsyncIterator[str]) -> list[str]:
    return [frame async for frame in stream]


# ---- Order invariants ----


@pytest.mark.asyncio
async def test_event_order_matches_contract() -> None:
    """status:thinking -> message (plan) -> status:calling_tool -> tool_call ->
    tool_result -> ... -> message (final) -> done.
    """
    request = BuildRequest(
        systemId="sys_test",
        prompt="Planner feeds Coder.",
        conversationId="conv_fixed",
    )

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": GOOD_PLAN}
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "description": "Reads the prompt and emits a plan that the Coder consumes.",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_1",
            "ok": True,
            "action": {
                "action": "addNode",
                "systemId": "sys_test",
                "title": "Planner",
                "clientNodeId": "tmp_planner1",
            },
        }
        yield {
            "kind": "tool_call",
            "id": "tc_2",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Coder",
                "description": "Receives the plan from Planner and emits the code.",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_2",
            "ok": True,
            "action": {
                "action": "addNode",
                "systemId": "sys_test",
                "title": "Coder",
                "clientNodeId": "tmp_coder1",
            },
        }
        yield {
            "kind": "tool_call",
            "id": "tc_3",
            "tool_name": "add_pipe",
            "arguments": {
                "systemId": "sys_test",
                "fromNodeId": "tmp_planner1",
                "toNodeId": "tmp_coder1",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_3",
            "ok": True,
            "action": {
                "action": "addPipe",
                "systemId": "sys_test",
                "fromNodeId": "tmp_planner1",
                "toNodeId": "tmp_coder1",
                "clientPipeId": "tmp_pipe1",
            },
        }
        yield {"kind": "message", "text": "Planner feeds Coder. Pipe carries the plan."}

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]

    # Plan-first: a `message` event arrives before the first `tool_call`.
    first_message_index = names.index("message")
    first_tool_call_index = names.index("tool_call")
    assert first_message_index < first_tool_call_index

    # Each tool_call is followed by a matching tool_result with the same id.
    tool_call_ids = [p["data"]["id"] for p in parsed if p["event"] == "tool_call"]
    tool_result_ids = [p["data"]["id"] for p in parsed if p["event"] == "tool_result"]
    assert tool_call_ids == tool_result_ids == ["tc_1", "tc_2", "tc_3"]

    # Every tool_call is immediately preceded by status:calling_tool.
    for i, name in enumerate(names):
        if name == "tool_call":
            assert names[i - 1] == "status"
            assert parsed[i - 1]["data"]["state"] == "calling_tool"
            assert parsed[i - 1]["data"]["tool_name"] == parsed[i]["data"]["tool_name"]

    # Last event is `done` and conversation_id round-trips from the request.
    assert names[-1] == "done"
    assert parsed[-1]["data"]["conversationId"] == "conv_fixed"
    assert parsed[-1]["data"]["turnId"].startswith("turn_")


@pytest.mark.asyncio
async def test_conversation_and_turn_ids_round_trip() -> None:
    request = BuildRequest(
        systemId="sys_test",
        prompt="hi",
        conversationId="conv_round_trip",
    )

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": "Nothing to build."}

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    done = parsed[-1]
    assert done["event"] == "done"
    assert done["data"]["conversationId"] == "conv_round_trip"
    assert done["data"]["turnId"].startswith("turn_")


# ---- Cancellation ----


@pytest.mark.asyncio
async def test_cancellation_stops_event_emission_mid_stream() -> None:
    """Setting the abort signal mid-stream stops the loop. We assert that the
    consumer never sees the events emitted after the abort point."""
    request = BuildRequest(systemId="sys_test", prompt="long build")
    abort = asyncio.Event()

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": GOOD_PLAN}
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "First",
                "description": "First node feeds the second; downstream consumes its output.",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_1",
            "ok": True,
            "action": {"action": "addNode", "clientNodeId": "tmp_1"},
        }
        # Trip the abort BEFORE the next tool_call leaves the runner.
        abort.set()
        yield {
            "kind": "tool_call",
            "id": "tc_2",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Second",
                "description": "Should never reach the wire because the abort was tripped.",
            },
        }
        yield {"kind": "message", "text": "Should never appear."}

    frames = await _consume(
        run_turn_stream(request, runner=stub_runner, abort_signal=abort)
    )
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    # We saw exactly one tool_call, the first.
    assert names.count("tool_call") == 1
    # No `done` event because the loop returned without finishing.
    assert "done" not in names
    # The "Should never appear." message was never emitted.
    final_messages = [
        p["data"]["text"] for p in parsed if p["event"] == "message"
    ]
    assert all("Should never appear." not in m for m in final_messages)


# ---- Plan eval gate ----


def test_plan_eval_rejects_banned_words() -> None:
    bad_plan = (
        "Build a robust seamless pipeline that empowers the engineer. "
        "Add a Planner agent and a Coder agent. "
        "Connect them with a pipe. "
        "These nodes earn their place because the engineer asked."
    )
    result = evaluate_plan(bad_plan, existing_nodes_count=0, existing_pipes_count=0)
    assert result.ok is False
    joined = " ".join(result.reasons)
    assert "robust" in joined or "seamless" in joined or "empower" in joined


def test_plan_eval_rejects_too_short_plan() -> None:
    result = evaluate_plan(
        "Add a Planner.", existing_nodes_count=0, existing_pipes_count=0
    )
    assert result.ok is False
    assert any("too short" in r for r in result.reasons)


def test_plan_eval_rejects_missing_connectivity_on_multi_node_plan() -> None:
    plan = (
        "Add a Planner agent. Add a Coder agent. Add a Reviewer agent. "
        "Each agent runs in isolation with no shared inputs. "
        "Three nodes earn their place because the engineer asked for three workers."
    )
    result = evaluate_plan(plan, existing_nodes_count=0, existing_pipes_count=0)
    assert result.ok is False
    assert any("pipe" in r.lower() or "connection" in r.lower() for r in result.reasons)


def test_plan_eval_no_op_short_circuits() -> None:
    result = evaluate_plan(
        "Nothing to build.", existing_nodes_count=3, existing_pipes_count=2
    )
    assert result.ok is True
    assert result.is_no_op is True


def test_plan_eval_passes_good_plan() -> None:
    result = evaluate_plan(
        GOOD_PLAN, existing_nodes_count=0, existing_pipes_count=0
    )
    assert result.ok is True
    assert result.is_no_op is False


@pytest.mark.asyncio
async def test_plan_with_banned_words_emits_done_after_replan_or_error() -> None:
    """The agent re-plans once on a rejected plan. If the second plan also
    fails, an `error` event is emitted with code `internal` (the runner uses
    `internal` for plan_rejected since the contract's error code list is
    fixed)."""
    request = BuildRequest(systemId="sys_test", prompt="x")
    bad_plan = (
        "Build a robust seamless platform that empowers the engineer. "
        "Add a Planner agent and a Coder agent. "
        "Connect them with a pipe. "
        "These nodes earn their place because the engineer asked."
    )

    async def planner(_req: BuildRequest) -> str:
        return bad_plan

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        # Should never be reached because plan eval rejects twice.
        yield {"kind": "message", "text": "should not appear"}

    frames = await _consume(
        run_turn_stream(request, runner=stub_runner, planner=planner)
    )
    parsed = _parse_frames(frames)
    assert parsed[-1]["event"] == "error"
    assert "plan_rejected" in parsed[-1]["data"]["message"]


# ---- Action eval gate ----


def test_action_eval_rejects_self_loop() -> None:
    state = {
        "nodes": {"n1": {"systemId": "sys_test", "title": "A"}},
        "pipes": {},
        "validate_called": False,
        "pending_node_ids": set(),
    }
    result = evaluate_action(
        {
            "tool_name": "add_pipe",
            "arguments": {
                "systemId": "sys_test",
                "fromNodeId": "n1",
                "toNodeId": "n1",
            },
        },
        state,
    )
    assert result.ok is False
    assert "self-loop" in (result.reason or "")


def test_action_eval_rejects_duplicate_pipe() -> None:
    state = {
        "nodes": {
            "n1": {"systemId": "sys_test", "title": "A"},
            "n2": {"systemId": "sys_test", "title": "B"},
        },
        "pipes": {
            "p1": {"systemId": "sys_test", "fromNodeId": "n1", "toNodeId": "n2"},
        },
        "validate_called": False,
        "pending_node_ids": set(),
    }
    result = evaluate_action(
        {
            "tool_name": "add_pipe",
            "arguments": {
                "systemId": "sys_test",
                "fromNodeId": "n1",
                "toNodeId": "n2",
            },
        },
        state,
    )
    assert result.ok is False
    assert "duplicate" in (result.reason or "").lower()


def test_action_eval_rejects_missing_endpoint() -> None:
    state = {
        "nodes": {"n1": {"systemId": "sys_test", "title": "A"}},
        "pipes": {},
        "validate_called": False,
        "pending_node_ids": set(),
    }
    result = evaluate_action(
        {
            "tool_name": "add_pipe",
            "arguments": {
                "systemId": "sys_test",
                "fromNodeId": "n1",
                "toNodeId": "missing",
            },
        },
        state,
    )
    assert result.ok is False
    assert "missing target" in (result.reason or "")


def test_action_eval_rejects_collision() -> None:
    state = {
        "nodes": {
            "n1": {
                "systemId": "sys_test",
                "title": "A",
                "x": 240.0,
                "y": 180.0,
            }
        },
        "pipes": {},
        "validate_called": False,
        "pending_node_ids": set(),
    }
    result = evaluate_action(
        {
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "B",
                "description": "Collides with the existing node within 80 px.",
                "x": 250.0,
                "y": 180.0,
            },
        },
        state,
    )
    assert result.ok is False
    assert "collide" in (result.reason or "")


def test_action_eval_rejects_validate_twice() -> None:
    state = {
        "nodes": {},
        "pipes": {},
        "validate_called": True,
        "pending_node_ids": set(),
    }
    result = evaluate_action(
        {"tool_name": "validate", "arguments": {"systemId": "sys_test"}},
        state,
    )
    assert result.ok is False


def test_action_eval_passes_good_add_node() -> None:
    state = {
        "nodes": {},
        "pipes": {},
        "validate_called": False,
        "pending_node_ids": set(),
    }
    result = evaluate_action(
        {
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "description": "Reads the prompt and emits a plan for downstream agents.",
                "x": 240.0,
                "y": 180.0,
            },
        },
        state,
    )
    assert result.ok is True


@pytest.mark.asyncio
async def test_self_loop_is_skipped_at_runtime_with_message() -> None:
    """When the runner produces a self-loop add_pipe, the action eval rejects
    it; the builder emits a `Skipped: ...` message and continues."""
    request = BuildRequest(systemId="sys_test", prompt="self loop")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": GOOD_PLAN}
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Loop",
                "description": "One node that the model erroneously tries to wire to itself.",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_1",
            "ok": True,
            "action": {
                "action": "addNode",
                "systemId": "sys_test",
                "title": "Loop",
                "clientNodeId": "tmp_solo",
            },
        }
        # Self-loop attempt - eval rejects this.
        yield {
            "kind": "tool_call",
            "id": "tc_2",
            "tool_name": "add_pipe",
            "arguments": {
                "systemId": "sys_test",
                "fromNodeId": "tmp_solo",
                "toNodeId": "tmp_solo",
            },
        }
        yield {"kind": "message", "text": "Single node Loop."}

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    # Exactly one tool_call (the add_node). The self-loop add_pipe was skipped.
    assert names.count("tool_call") == 1
    # A "Skipped:" message was emitted.
    skipped = [
        p["data"]["text"]
        for p in parsed
        if p["event"] == "message" and p["data"]["text"].startswith("Skipped:")
    ]
    assert len(skipped) == 1
    assert "self-loop" in skipped[0]


# ---- No-op plan ----


@pytest.mark.asyncio
async def test_no_op_plan_emits_done_with_zero_tool_calls() -> None:
    request = BuildRequest(
        systemId="sys_test",
        prompt="no change",
        conversationId="conv_noop",
        existingNodesCount=3,
        existingPipesCount=2,
    )

    async def planner(_req: BuildRequest) -> str:
        return "Nothing to build."

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        # Runner is irrelevant; the no-op plan short-circuits.
        if False:
            yield {"kind": "message", "text": "unreachable"}

    frames = await _consume(
        run_turn_stream(request, runner=stub_runner, planner=planner)
    )
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    assert "tool_call" not in names
    assert names[-1] == "done"
    assert parsed[-1]["data"]["conversationId"] == "conv_noop"
    # The plan message was emitted.
    msg = next(p for p in parsed if p["event"] == "message")
    assert msg["data"]["text"] == "Nothing to build."


# ---- Tailoring placeholder substitution ----


def test_render_system_prompt_with_empty_context_renders_cleanly() -> None:
    """A request with no tailoring fields renders the prompt with empty
    placeholders. No `{{...}}` literal remains."""
    request = BuildRequest(systemId="sys_test", prompt="x")
    rendered = render_system_prompt(request)
    assert "{{" not in rendered
    assert "}}" not in rendered
    # Counts are present as numeric strings.
    assert "0 nodes" in rendered
    assert "0 pipes" in rendered


def test_render_system_prompt_with_full_context_substitutes_values() -> None:
    request = BuildRequest(
        systemId="sys_test",
        prompt="x",
        userFirstName="Lex",
        userTeam="Platform",
        priorSystemsSummary="Shipped a 3-agent triage loop last week.",
        systemName="Ticket Triage",
        existingNodesCount=4,
        existingPipesCount=3,
    )
    rendered = render_system_prompt(request)
    assert "Lex" in rendered
    assert "Platform" in rendered
    assert "Shipped a 3-agent triage loop last week." in rendered
    assert "Ticket Triage" in rendered
    assert "4 nodes" in rendered
    assert "3 pipes" in rendered
    assert "{{" not in rendered
