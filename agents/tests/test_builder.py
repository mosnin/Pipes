"""Integration test for the streaming run loop.

The Agents SDK is stubbed via the `runner` injection point on
`run_turn_stream`. We feed a deterministic sequence of Step records and assert
that the SSE wire output matches the contract.

Plan-first flow: the runner's first emitted step is a `plan` Step. The builder
gates tool_call execution behind a successful `evaluate_plan`. The fixtures in
this file emit a passing plan so they exercise the same call shape that the
Agents SDK will produce in production.
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

import pytest

from agents.builder import run_turn_stream
from agents.schemas import BuildRequest, ProviderUsage


# A plan paragraph that satisfies `evaluate_plan` for a 2-3 node fresh canvas.
SAMPLE_PLAN_2NODE = (
    "Build a Planner agent that hands work to a Coder agent. "
    "Add a Planner node and a Coder node. "
    "Connect them with one pipe carrying the plan from Planner to Coder. "
    "Two nodes earn their place because the engineer asked for a planner-coder loop."
)

SAMPLE_PLAN_LOOP = (
    "Build a tight planner-coder loop. "
    "Add a Planner agent and a Coder agent. "
    "Connect them with a pipe so the plan flows from Planner to Coder. "
    "Two nodes earn their place because the request is a two-node loop."
)


def _parse_frames(frames: list[str]) -> list[dict[str, Any]]:
    """Split SSE frames into a list of {event, data} dicts."""
    out: list[dict[str, Any]] = []
    for frame in frames:
        # Each frame is "event: NAME\ndata: JSON\n\n".
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


@pytest.mark.asyncio
async def test_happy_path_streams_expected_events() -> None:
    request = BuildRequest(systemId="sys_test", prompt="Planner feeds Coder.")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        # Plan first.
        yield {"kind": "plan", "text": SAMPLE_PLAN_2NODE}
        # add_node Planner
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "description": "Reads the prompt and emits a step list for Coder.",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_1",
            "ok": True,
            "action": {
                "action": "addNode",
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "clientNodeId": "tmp_aaaaaaaa",
            },
        }
        # add_node Coder
        yield {
            "kind": "tool_call",
            "id": "tc_2",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Coder",
                "description": "Receives the plan from Planner and writes the code.",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_2",
            "ok": True,
            "action": {
                "action": "addNode",
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Coder",
                "clientNodeId": "tmp_bbbbbbbb",
            },
        }
        # add_pipe between them
        yield {
            "kind": "tool_call",
            "id": "tc_3",
            "tool_name": "add_pipe",
            "arguments": {
                "systemId": "sys_test",
                "fromNodeId": "tmp_aaaaaaaa",
                "toNodeId": "tmp_bbbbbbbb",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_3",
            "ok": True,
            "action": {
                "action": "addPipe",
                "systemId": "sys_test",
                "fromNodeId": "tmp_aaaaaaaa",
                "toNodeId": "tmp_bbbbbbbb",
                "clientPipeId": "tmp_cccccccc",
            },
        }
        # Final assistant message
        yield {"kind": "message", "text": "Planner feeds Coder. Pipe carries the plan."}

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)

    names = [p["event"] for p in parsed]
    # First event is status: thinking.
    assert names[0] == "status"
    assert parsed[0]["data"] == {"state": "thinking"}
    # Last event is done.
    assert names[-1] == "done"
    assert "conversationId" in parsed[-1]["data"]
    assert "turnId" in parsed[-1]["data"]
    # We saw exactly 3 tool_call frames and 3 tool_result frames.
    assert names.count("tool_call") == 3
    assert names.count("tool_result") == 3
    # Two assistant messages: the plan and the final message.
    assert names.count("message") == 2
    msgs = [p for p in parsed if p["event"] == "message"]
    assert msgs[0]["data"]["role"] == "assistant"
    assert "Planner" in msgs[0]["data"]["text"]  # plan mentions Planner
    assert "Planner" in msgs[-1]["data"]["text"]  # final message also mentions Planner


@pytest.mark.asyncio
async def test_tool_call_limit_terminates_with_error() -> None:
    request = BuildRequest(systemId="sys_test", prompt="loop")

    # The plan describes a small fan-out; the cap test exercises the runner's
    # tool-call counter regardless of the plan's stated node count.
    big_plan = (
        "Build a small fan-out from a Trigger to a Worker pool. "
        "Add a Trigger node and a Worker node. "
        "Connect them with a pipe so the trigger feeds the worker. "
        "Two nodes earn their place; the worker pool grows behind the worker."
    )

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": big_plan}
        for i in range(35):
            yield {
                "kind": "tool_call",
                "id": f"tc_{i}",
                "tool_name": "add_node",
                "arguments": {
                    "systemId": "sys_test",
                    "type": "Agent",
                    "title": f"N{i}",
                    "description": "Worker that processes one shard of the input stream.",
                    # Stagger x positions so the action eval gate does not
                    # reject for collisions.
                    "x": 240 + i * 220,
                    "y": 180,
                },
            }
            yield {
                "kind": "tool_result",
                "id": f"tc_{i}",
                "ok": True,
                "action": {"action": "addNode", "systemId": "sys_test", "clientNodeId": f"tmp_{i:08x}"},
            }

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    last = parsed[-1]
    assert last["event"] == "error"
    assert last["data"]["code"] == "tool_call_limit_exceeded"
    assert last["data"]["retryable"] is False


@pytest.mark.asyncio
async def test_message_event_emits_writing_message_status_first() -> None:
    request = BuildRequest(systemId="sys_test", prompt="hi")

    # The plan declares no-op so the runner is allowed to emit just a message.
    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": "Nothing to build."}
        # Following events would be ignored because is_no_op short-circuits to done.

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    # Expect: thinking, writing_message, message (the no-op plan), done.
    assert names == ["status", "status", "message", "done"]
    assert parsed[1]["data"] == {"state": "writing_message"}
    assert parsed[2]["data"]["text"] == "Nothing to build."


@pytest.mark.asyncio
async def test_runner_exception_emits_internal_error() -> None:
    request = BuildRequest(systemId="sys_test", prompt="fail")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": SAMPLE_PLAN_2NODE}
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "X",
                "description": "Sample node that pushes data into the next stage.",
            },
        }
        raise RuntimeError("model unavailable")

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    assert parsed[-1]["event"] == "error"
    assert parsed[-1]["data"]["code"] == "internal"
    assert parsed[-1]["data"]["retryable"] is True


@pytest.mark.asyncio
async def test_meta_event_lands_before_done_with_cost_payload() -> None:
    """When a runner emits a `usage` step, the builder emits one final `meta`
    SSE event carrying cost telemetry right before `done`. This is the
    learning-loop hook: every turn ships measurable cost down the wire."""
    request = BuildRequest(systemId="sys_test", prompt="planner+coder")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": SAMPLE_PLAN_2NODE}
        yield {"kind": "message", "text": "Planner feeds Coder."}
        # Provider usage forwarded by `_run_streaming_with_provider`. Tests
        # mimic that by yielding a `usage` step directly.
        yield {
            "kind": "usage",
            "provider_usage": ProviderUsage(
                input_tokens=1000,
                output_tokens=400,
                model="gpt-4o-mini",
                provider="openai",
            ),
        }

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]

    # Order invariant: meta is the LAST event before done.
    assert names[-1] == "done"
    assert names[-2] == "meta"

    meta = parsed[-2]["data"]
    assert meta["cost"]["tokens_in"] == 1000
    assert meta["cost"]["tokens_out"] == 400
    assert meta["cost"]["model"] == "gpt-4o-mini"
    assert meta["cost"]["provider"] == "openai"
    # Cost: 1000/1M * 0.15 + 400/1M * 0.60 = 0.00015 + 0.00024 = 0.00039
    assert meta["cost"]["dollars"] == pytest.approx(0.00039, rel=1e-3)
    assert meta["tool_call_count"] == 0
    assert isinstance(meta["duration_seconds"], (int, float))
    assert meta["duration_seconds"] >= 0


@pytest.mark.asyncio
async def test_meta_event_skipped_when_no_usage_available() -> None:
    """If the runner never emits a `usage` step, no `meta` event is emitted.
    The route persists `costSnapshot=None` rather than $0, which would lie."""
    request = BuildRequest(systemId="sys_test", prompt="planner+coder")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": SAMPLE_PLAN_2NODE}
        yield {"kind": "message", "text": "Planner feeds Coder."}
        # No usage step.

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]

    assert names[-1] == "done"
    assert "meta" not in names


@pytest.mark.asyncio
async def test_meta_event_accepts_dict_provider_usage() -> None:
    """Tests / older runners may yield a plain dict for provider_usage; the
    builder accepts either shape and produces the same meta event."""
    request = BuildRequest(systemId="sys_test", prompt="planner+coder")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": SAMPLE_PLAN_2NODE}
        yield {"kind": "message", "text": "ok"}
        yield {
            "kind": "usage",
            "provider_usage": {
                "input_tokens": 50,
                "output_tokens": 25,
                "model": "claude-haiku-4-5-20251001",
                "provider": "anthropic",
            },
        }

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    assert names[-2] == "meta"
    meta = parsed[-2]["data"]
    assert meta["cost"]["provider"] == "anthropic"
    assert meta["cost"]["model"] == "claude-haiku-4-5-20251001"
    # 50/1M * 1.00 + 25/1M * 5.00 = 0.00005 + 0.000125 = 0.000175
    assert meta["cost"]["dollars"] == pytest.approx(0.000175, rel=1e-3)


@pytest.mark.asyncio
async def test_plan_only_request_emits_done_with_zero_tool_calls() -> None:
    """A request with plan_only=True emits the proposal then `done` with no
    tool calls, regardless of what the runner would otherwise yield."""
    plan_with_json = (
        SAMPLE_PLAN_2NODE
        + '\n\n```json\n{"steps":['
        '{"kind":"add_node","label":"Planner","args":{"title":"Planner","description":"x","x":240,"y":180}},'
        '{"kind":"add_node","label":"Coder","args":{"title":"Coder","description":"y","x":460,"y":180}},'
        '{"kind":"add_pipe","label":"wire","args":{"fromStepId":"s1","toStepId":"s2"}}'
        ']}\n```'
    )
    request = BuildRequest(systemId="sys_test", prompt="x", planOnly=True)

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": plan_with_json}
        yield {
            "kind": "tool_call",
            "id": "tc_unreachable",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Unreachable",
                "description": "Should never be emitted because plan_only=True.",
            },
        }

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    assert "tool_call" not in names
    assert "plan_proposal" in names
    assert names[-1] == "done"


@pytest.mark.asyncio
async def test_execute_steps_runs_supplied_steps_in_order_skipping_planning() -> None:
    """When execute_steps is supplied, the builder skips the plan_proposal
    phase and runs each supplied step as a tool call in order."""
    from agents.schemas import PlanStep

    steps = [
        PlanStep(
            id="s1",
            kind="add_node",
            label="Planner",
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
            kind="add_pipe",
            label="wire s1 to s1",
            args={"fromStepId": "s1", "toStepId": "s1"},
        ),
    ]
    request = BuildRequest(
        systemId="sys_exec",
        prompt="x",
        executeSteps=steps,
    )

    async def unreachable_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        if False:
            yield {"kind": "message", "text": "unreachable"}

    frames = await _consume(run_turn_stream(request, runner=unreachable_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    assert "plan_proposal" not in names
    # Both supplied steps fire as tool_calls.
    assert names.count("tool_call") == 2
    tool_calls = [p for p in parsed if p["event"] == "tool_call"]
    assert tool_calls[0]["data"]["tool_name"] == "add_node"
    assert tool_calls[1]["data"]["tool_name"] == "add_pipe"
    assert names[-1] == "done"


@pytest.mark.asyncio
async def test_meta_event_counts_tool_calls() -> None:
    """`tool_call_count` on the meta event reflects how many tool calls fired."""
    request = BuildRequest(systemId="sys_test", prompt="planner+coder")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": SAMPLE_PLAN_2NODE}
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "description": "Reads the prompt and emits a plan for Coder.",
            },
        }
        yield {
            "kind": "tool_result",
            "id": "tc_1",
            "ok": True,
            "action": {
                "action": "addNode",
                "systemId": "sys_test",
                "type": "Agent",
                "title": "Planner",
                "clientNodeId": "tmp_aaaaaaaa",
            },
        }
        yield {"kind": "message", "text": "Done."}
        yield {
            "kind": "usage",
            "provider_usage": ProviderUsage(
                input_tokens=10,
                output_tokens=5,
                model="gpt-4o-mini",
                provider="openai",
            ),
        }

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    meta = next(p for p in parsed if p["event"] == "meta")
    assert meta["data"]["tool_call_count"] == 1
