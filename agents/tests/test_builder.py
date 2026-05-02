"""Integration test for the streaming run loop.

The Agents SDK is stubbed via the `runner` injection point on
`run_turn_stream`. We feed a deterministic sequence of Step records and assert
that the SSE wire output matches the contract.
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

import pytest

from agents.builder import run_turn_stream
from agents.schemas import BuildRequest


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
        # add_node Planner
        yield {
            "kind": "tool_call",
            "id": "tc_1",
            "tool_name": "add_node",
            "arguments": {"systemId": "sys_test", "type": "Agent", "title": "Planner"},
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
            "arguments": {"systemId": "sys_test", "type": "Agent", "title": "Coder"},
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
    # Exactly one assistant message.
    assert names.count("message") == 1
    msg = next(p for p in parsed if p["event"] == "message")
    assert msg["data"]["role"] == "assistant"
    assert "Planner" in msg["data"]["text"]


@pytest.mark.asyncio
async def test_tool_call_limit_terminates_with_error() -> None:
    request = BuildRequest(systemId="sys_test", prompt="loop")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        for i in range(35):
            yield {
                "kind": "tool_call",
                "id": f"tc_{i}",
                "tool_name": "add_node",
                "arguments": {"systemId": "sys_test", "type": "Agent", "title": f"N{i}"},
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

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "message", "text": "Built."}

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    names = [p["event"] for p in parsed]
    # Expect: thinking, writing_message, message, done.
    assert names == ["status", "status", "message", "done"]
    assert parsed[1]["data"] == {"state": "writing_message"}


@pytest.mark.asyncio
async def test_runner_exception_emits_internal_error() -> None:
    request = BuildRequest(systemId="sys_test", prompt="fail")

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "tool_call", "id": "tc_1", "tool_name": "add_node", "arguments": {}}
        raise RuntimeError("model unavailable")

    frames = await _consume(run_turn_stream(request, runner=stub_runner))
    parsed = _parse_frames(frames)
    assert parsed[-1]["event"] == "error"
    assert parsed[-1]["data"]["code"] == "internal"
    assert parsed[-1]["data"]["retryable"] is True
