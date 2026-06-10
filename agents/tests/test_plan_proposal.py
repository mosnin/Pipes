"""Tests for the interactive plan-proposal flow.

Locks the new SSE contract:
  * `plan_proposal` event lands AFTER the plan `message` and BEFORE any tool_call.
  * `plan_only=True` emits the proposal and then `done` with zero tool calls.
  * `execute_steps=[...]` skips planning entirely and runs the steps in order,
    resolving `fromStepId`/`toStepId` to the concrete node ids returned by
    prior `add_node` tool results.
  * Backwards compat: if the model omits the JSON block, the legacy text-only
    path still runs through.
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

import pytest

from agents.builder import (
    run_turn_stream,
    split_plan_text_and_steps,
)
from agents.plan_evaluator import evaluate_plan_with_steps
from agents.schemas import BuildRequest, PlanProposal, PlanStep


PLAN_PARAGRAPH = (
    "Build a planner-coder loop. "
    "Add a Planner agent and a Coder agent. "
    "Connect them with a pipe so the plan flows from Planner to Coder. "
    "Two nodes earn their place because the engineer asked for a small loop."
)


def _make_plan_message_with_json() -> str:
    payload = {
        "planText": PLAN_PARAGRAPH,
        "steps": [
            {
                "kind": "add_node",
                "label": "Add Planner agent",
                "args": {
                    "title": "Planner agent",
                    "description": "Reads the prompt and emits a plan",
                    "x": 240,
                    "y": 180,
                },
            },
            {
                "kind": "add_node",
                "label": "Add Coder agent",
                "args": {
                    "title": "Coder agent",
                    "description": "Implements the plan",
                    "x": 460,
                    "y": 180,
                },
            },
            {
                "kind": "add_pipe",
                "label": "Connect Planner to Coder",
                "args": {"fromStepId": "s1", "toStepId": "s2"},
            },
        ],
    }
    return f"{PLAN_PARAGRAPH}\n\n```json\n{json.dumps(payload)}\n```"


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


# ---- split_plan_text_and_steps ----


def test_split_plan_returns_proposal_when_json_block_present() -> None:
    text = _make_plan_message_with_json()
    stripped, proposal = split_plan_text_and_steps(text)
    assert proposal is not None
    assert len(proposal.steps) == 3
    assert proposal.steps[0].id == "s1"
    assert proposal.steps[0].kind == "add_node"
    assert proposal.steps[2].kind == "add_pipe"
    assert proposal.steps[2].args["fromStepId"] == "s1"
    # The stripped text no longer contains the fenced block.
    assert "```" not in stripped
    assert "planText" not in stripped


def test_split_plan_falls_back_when_no_json_block() -> None:
    stripped, proposal = split_plan_text_and_steps(PLAN_PARAGRAPH)
    assert proposal is None
    assert stripped == PLAN_PARAGRAPH


def test_split_plan_falls_back_when_json_is_malformed() -> None:
    text = PLAN_PARAGRAPH + "\n\n```json\n{not valid json}\n```"
    stripped, proposal = split_plan_text_and_steps(text)
    assert proposal is None
    # Unchanged because we couldn't parse.
    assert stripped == text


def test_split_plan_falls_back_when_steps_missing() -> None:
    text = PLAN_PARAGRAPH + '\n\n```json\n{"planText":"x"}\n```'
    stripped, proposal = split_plan_text_and_steps(text)
    assert proposal is None


def test_split_plan_assigns_sequential_ids_when_omitted() -> None:
    text = (
        PLAN_PARAGRAPH
        + '\n\n```json\n{"steps":[{"kind":"add_node","label":"A","args":{}},'
        '{"kind":"add_node","label":"B","args":{}}]}\n```'
    )
    _, proposal = split_plan_text_and_steps(text)
    assert proposal is not None
    assert [s.id for s in proposal.steps] == ["s1", "s2"]


# ---- evaluate_plan_with_steps ----


def test_evaluate_plan_with_steps_passes_on_good_plan() -> None:
    steps = [
        {"id": "s1", "kind": "add_node", "label": "Planner"},
        {"id": "s2", "kind": "add_node", "label": "Coder"},
        {
            "id": "s3",
            "kind": "add_pipe",
            "label": "wire",
            "args": {"fromStepId": "s1", "toStepId": "s2"},
        },
    ]
    result = evaluate_plan_with_steps(PLAN_PARAGRAPH, steps, 0, 0)
    assert result.ok is True


def test_evaluate_plan_with_steps_rejects_pipe_to_unknown_step() -> None:
    steps = [
        {"id": "s1", "kind": "add_node", "label": "Planner"},
        {
            "id": "s2",
            "kind": "add_pipe",
            "label": "wire",
            "args": {"fromStepId": "s1", "toStepId": "s99"},
        },
    ]
    result = evaluate_plan_with_steps(PLAN_PARAGRAPH, steps, 0, 0)
    assert result.ok is False
    assert any("s99" in r for r in result.reasons)


def test_evaluate_plan_with_steps_rejects_self_loop_pipe() -> None:
    steps = [
        {"id": "s1", "kind": "add_node", "label": "Planner"},
        {
            "id": "s2",
            "kind": "add_pipe",
            "label": "loop",
            "args": {"fromStepId": "s1", "toStepId": "s1"},
        },
    ]
    result = evaluate_plan_with_steps(PLAN_PARAGRAPH, steps, 0, 0)
    assert result.ok is False
    assert any("self-loop" in r for r in result.reasons)


# ---- plan_proposal SSE event order ----


@pytest.mark.asyncio
async def test_plan_proposal_lands_after_message_and_before_tool_call() -> None:
    """The new event must land AFTER the textual plan message and BEFORE the
    first tool_call. This is the contract the PlanEditor depends on."""
    request = BuildRequest(systemId="sys_test", prompt="planner+coder")
    plan_with_json = _make_plan_message_with_json()

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": plan_with_json}
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "description": "Reads the prompt and emits a plan that Coder uses.",
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
                "clientNodeId": "tmp_p1",
            },
        }
        yield {"kind": "message", "text": "Planner ready."}

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]

    assert "plan_proposal" in names
    msg_idx = names.index("message")
    proposal_idx = names.index("plan_proposal")
    first_tool_idx = names.index("tool_call")
    assert msg_idx < proposal_idx < first_tool_idx

    proposal_payload = parsed[proposal_idx]["data"]
    assert proposal_payload["planText"] == PLAN_PARAGRAPH
    assert len(proposal_payload["steps"]) == 3
    assert proposal_payload["steps"][0]["id"] == "s1"
    # The textual message no longer carries the JSON block.
    msg_text = parsed[msg_idx]["data"]["text"]
    assert "```" not in msg_text
    assert "planText" not in msg_text


@pytest.mark.asyncio
async def test_plan_only_emits_proposal_then_done_with_no_tool_calls() -> None:
    """plan_only=True short-circuits after the proposal. Zero tool calls."""
    request = BuildRequest(
        systemId="sys_test",
        prompt="planner+coder",
        planOnly=True,
    )
    plan_with_json = _make_plan_message_with_json()

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": plan_with_json}
        # The runner may yield more events; the builder must stop after the
        # proposal because plan_only=True.
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "description": "Should not be emitted because plan_only=True.",
            },
        }

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    assert "tool_call" not in names
    assert names[-1] == "done"
    assert "plan_proposal" in names


@pytest.mark.asyncio
async def test_execute_steps_skips_planning_and_runs_supplied_steps() -> None:
    """execute_steps=[...] bypasses the plan phase. The supplied steps run
    in order. fromStepId/toStepId references are resolved against earlier
    add_node tool results."""
    steps = [
        PlanStep(
            id="s1",
            kind="add_node",
            label="Add Planner",
            args={
                "type": "Agent",
                "title": "Planner",
                "description": "Reads the prompt and emits a plan.",
                "x": 240,
                "y": 180,
            },
        ),
        PlanStep(
            id="s2",
            kind="add_node",
            label="Add Coder",
            args={
                "type": "Agent",
                "title": "Coder",
                "description": "Implements the plan from Planner.",
                "x": 460,
                "y": 180,
            },
        ),
        PlanStep(
            id="s3",
            kind="add_pipe",
            label="Connect Planner to Coder",
            args={"fromStepId": "s1", "toStepId": "s2"},
        ),
    ]
    request = BuildRequest(
        systemId="sys_exec",
        prompt="planner+coder",
        executeSteps=steps,
    )

    async def unreachable_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "message", "text": "should not appear"}

    frames = await _consume(
        run_turn_stream(request, runner=unreachable_runner)
    )
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    # No plan_proposal — the caller already approved the plan.
    assert "plan_proposal" not in names
    # No model `message` event — execute_steps suppresses planning.
    assert names.count("message") == 0
    # 3 tool_calls and 3 tool_results.
    assert names.count("tool_call") == 3
    assert names.count("tool_result") == 3
    # The add_pipe step's args resolved to a real fromNodeId.
    pipe_call = [p for p in parsed if p["event"] == "tool_call"][2]
    assert pipe_call["data"]["tool_name"] == "add_pipe"
    args = pipe_call["data"]["arguments"]
    assert "fromStepId" not in args
    assert "toStepId" not in args
    assert args["fromNodeId"]
    assert args["toNodeId"]
    assert names[-1] == "done"


@pytest.mark.asyncio
async def test_execute_steps_skips_disabled_steps() -> None:
    """A step with enabled=False is skipped entirely."""
    steps = [
        PlanStep(
            id="s1",
            kind="add_node",
            label="Keep",
            args={
                "type": "Agent",
                "title": "Keep",
                "description": "This one runs.",
                "x": 240,
                "y": 180,
            },
        ),
        PlanStep(
            id="s2",
            kind="add_node",
            label="Skip",
            args={
                "type": "Agent",
                "title": "Skip",
                "description": "User disabled this step.",
            },
            enabled=False,
        ),
    ]
    request = BuildRequest(
        systemId="sys_exec",
        prompt="x",
        executeSteps=steps,
    )

    async def unreachable_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        if False:
            yield {"kind": "message", "text": "x"}

    frames = await _consume(
        run_turn_stream(request, runner=unreachable_runner)
    )
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    assert names.count("tool_call") == 1
    # The remaining tool_call is the enabled "Keep" step.
    tc = [p for p in parsed if p["event"] == "tool_call"][0]
    assert tc["data"]["arguments"]["title"] == "Keep"


@pytest.mark.asyncio
async def test_legacy_fallback_when_model_omits_json_block() -> None:
    """If the model emits a plain plan with no JSON block, no plan_proposal
    is emitted but the legacy tool_call flow still runs. Backwards compat."""
    request = BuildRequest(systemId="sys_test", prompt="planner+coder")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        # Plain plan, no JSON block at all.
        yield {"kind": "plan", "text": PLAN_PARAGRAPH}
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "description": "Reads the prompt and emits a plan that Coder uses.",
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
                "clientNodeId": "tmp_p1",
            },
        }
        yield {"kind": "message", "text": "Planner ready."}

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    # Legacy path: no proposal but tool_calls still flow.
    assert "plan_proposal" not in names
    assert names.count("tool_call") == 1
    assert names[-1] == "done"


def test_plan_proposal_to_dict_uses_camel_case_keys() -> None:
    """The on-wire payload uses camelCase so the TypeScript client can read
    it without translation."""
    proposal = PlanProposal(
        planText="x",
        steps=[
            PlanStep(id="s1", kind="add_node", label="A", args={"title": "A"}),
        ],
        auto_execute_after_ms=1500,
    )
    payload = proposal.to_dict()
    assert payload["planText"] == "x"
    assert payload["autoExecuteAfterMs"] == 1500
    assert payload["steps"][0]["id"] == "s1"
