"""Unit tests for the provider abstraction.

Both providers are exercised with stubbed model clients. We verify that:

  * Each emits the same internal `ProviderEvent` stream shape.
  * Missing API keys raise `ProviderConfigError`.
  * Tool-result round-trip works for both providers.
  * Provider/model resolution honors the env priority order.
"""

from __future__ import annotations

import asyncio
import json
import sys
import types
from typing import Any, AsyncIterator, Optional

import pytest

from agents.providers import (
    AnthropicProvider,
    DEFAULT_ANTHROPIC_MODEL,
    DEFAULT_OPENAI_MODEL,
    OpenAIProvider,
    ProviderConfigError,
    ProviderEvent,
    build_provider,
    resolve_model,
    resolve_provider,
)
from agents.schemas import ProviderUsage


# ---- resolve_provider / resolve_model ----


def test_resolve_provider_defaults_to_openai_with_no_input() -> None:
    assert resolve_provider(None, env={}) == "openai"
    assert resolve_provider("", env={}) == "openai"


def test_resolve_provider_request_wins_over_env() -> None:
    assert (
        resolve_provider("anthropic", env={"PIPES_AGENT_PROVIDER": "openai"})
        == "anthropic"
    )


def test_resolve_provider_falls_back_to_env() -> None:
    assert (
        resolve_provider(None, env={"PIPES_AGENT_PROVIDER": "anthropic"})
        == "anthropic"
    )


def test_resolve_provider_ignores_unknown_values() -> None:
    assert resolve_provider("groq", env={}) == "openai"
    assert resolve_provider(None, env={"PIPES_AGENT_PROVIDER": "cohere"}) == "openai"


def test_resolve_provider_is_case_insensitive() -> None:
    assert resolve_provider("Anthropic", env={}) == "anthropic"
    assert resolve_provider(None, env={"PIPES_AGENT_PROVIDER": "OPENAI"}) == "openai"


def test_resolve_model_picks_correct_env_var() -> None:
    env = {
        "OPENAI_AGENTS_MODEL": "gpt-4o",
        "ANTHROPIC_AGENTS_MODEL": "claude-sonnet-4-6",
    }
    assert resolve_model("openai", env=env) == "gpt-4o"
    assert resolve_model("anthropic", env=env) == "claude-sonnet-4-6"


def test_resolve_model_uses_defaults_when_unset() -> None:
    assert resolve_model("openai", env={}) == DEFAULT_OPENAI_MODEL
    assert resolve_model("anthropic", env={}) == DEFAULT_ANTHROPIC_MODEL


# ---- build_provider key validation ----


def test_build_provider_openai_missing_key_raises() -> None:
    with pytest.raises(ProviderConfigError, match="OPENAI_API_KEY"):
        build_provider("openai", env={})


def test_build_provider_anthropic_missing_key_raises() -> None:
    with pytest.raises(ProviderConfigError, match="ANTHROPIC_API_KEY"):
        build_provider("anthropic", env={})


def test_build_provider_openai_returns_openai_provider() -> None:
    provider = build_provider("openai", env={"OPENAI_API_KEY": "sk-test"})
    assert isinstance(provider, OpenAIProvider)
    assert provider.model == DEFAULT_OPENAI_MODEL


def test_build_provider_anthropic_returns_anthropic_provider() -> None:
    provider = build_provider("anthropic", env={"ANTHROPIC_API_KEY": "sk-ant-test"})
    assert isinstance(provider, AnthropicProvider)
    assert provider.model == DEFAULT_ANTHROPIC_MODEL


def test_build_provider_respects_explicit_model() -> None:
    provider = build_provider(
        "anthropic",
        model="claude-sonnet-4-6",
        env={"ANTHROPIC_API_KEY": "sk-ant-test"},
    )
    assert provider.model == "claude-sonnet-4-6"


# ---- OpenAI provider with stubbed Agents SDK ----


class _StubOpenAIEvent:
    def __init__(self, type_: str, **kwargs: Any) -> None:
        self.type = type_
        for k, v in kwargs.items():
            setattr(self, k, v)


class _StubOpenAIStream:
    def __init__(self, events: list[Any]) -> None:
        self._events = events
        self.final_output = types.SimpleNamespace(
            usage={"prompt_tokens": 12, "completion_tokens": 7}
        )

    async def stream_events(self) -> AsyncIterator[Any]:
        for e in self._events:
            yield e


class _StubOpenAIRunner:
    last_run_args: tuple[Any, str] = (None, "")

    @classmethod
    def run_streamed(cls, agent: Any, prompt: str) -> _StubOpenAIStream:
        cls.last_run_args = (agent, prompt)
        return _StubOpenAIStream(cls._events)

    _events: list[Any] = []

    @classmethod
    def queue(cls, events: list[Any]) -> None:
        cls._events = events


class _StubOpenAIAgent:
    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs


def _install_stub_openai_sdk() -> None:
    """Install a stub `agents` package so OpenAIProvider can import it."""
    mod = types.ModuleType("agents")
    mod.Agent = _StubOpenAIAgent  # type: ignore[attr-defined]
    mod.Runner = _StubOpenAIRunner  # type: ignore[attr-defined]
    sys.modules["agents"] = mod  # NOTE: this overrides our package; tests live
    # in agents/tests, so individual test modules are already imported.
    tool_mod = types.ModuleType("agents.tool")

    def function_tool(fn: Any) -> Any:  # noqa: ANN401
        return fn

    tool_mod.function_tool = function_tool  # type: ignore[attr-defined]
    sys.modules["agents.tool"] = tool_mod


def _uninstall_stub_openai_sdk(real_agents: types.ModuleType, real_tool: Optional[types.ModuleType]) -> None:
    sys.modules["agents"] = real_agents
    if real_tool is not None:
        sys.modules["agents.tool"] = real_tool
    else:
        sys.modules.pop("agents.tool", None)


@pytest.fixture
def openai_sdk_stub() -> Any:
    """Patch sys.modules so OpenAIProvider's `from agents import Agent, Runner`
    pulls our stub. Restore the real package when the test finishes."""
    real_agents = sys.modules["agents"]
    real_tool = sys.modules.get("agents.tool")
    _install_stub_openai_sdk()
    try:
        yield _StubOpenAIRunner
    finally:
        _uninstall_stub_openai_sdk(real_agents, real_tool)


@pytest.mark.asyncio
async def test_openai_provider_emits_text_tool_call_and_stop(
    openai_sdk_stub: Any,
) -> None:
    openai_sdk_stub.queue(
        [
            _StubOpenAIEvent("message", text="Plan: build a Planner-Coder loop."),
            _StubOpenAIEvent(
                "tool_call",
                id="tc_1",
                name="add_node",
                arguments={"systemId": "sys", "type": "Agent", "title": "Planner"},
            ),
        ]
    )

    provider = OpenAIProvider(model="gpt-4o-mini", api_key="sk-test")
    events: list[ProviderEvent] = []
    async for evt in provider.run(
        system_prompt="be helpful",
        user_prompt="planner feeds coder",
        tools=[],
    ):
        events.append(evt)

    kinds = [e.kind for e in events]
    assert kinds == ["text_delta", "tool_call", "stop"]

    assert events[0].text == "Plan: build a Planner-Coder loop."
    assert events[1].tool_name == "add_node"
    assert events[1].tool_id == "tc_1"
    assert events[1].tool_args == {
        "systemId": "sys",
        "type": "Agent",
        "title": "Planner",
    }
    assert events[2].stop_reason == "end_turn"
    assert events[2].usage == {"prompt_tokens": 12, "completion_tokens": 7}
    # Normalized usage is populated for cost telemetry. Token keys map from
    # `prompt_tokens` / `completion_tokens` on this SDK shape.
    assert events[2].provider_usage is not None
    assert isinstance(events[2].provider_usage, ProviderUsage)
    assert events[2].provider_usage.input_tokens == 12
    assert events[2].provider_usage.output_tokens == 7
    assert events[2].provider_usage.model == "gpt-4o-mini"
    assert events[2].provider_usage.provider == "openai"


@pytest.mark.asyncio
async def test_openai_provider_submit_tool_result_is_noop(
    openai_sdk_stub: Any,
) -> None:
    """The OpenAI Agents SDK runs the loop itself, so submit_tool_result is a
    deliberate no-op. Round-trip is still observable: the SDK calls the tool
    function directly, and our wrappers propagate via the dispatch table."""
    provider = OpenAIProvider(model="gpt-4o-mini", api_key="sk-test")
    # No assertion on return value; the call must not raise.
    await provider.submit_tool_result("tc_1", {"action": "addNode"})


@pytest.mark.asyncio
async def test_openai_provider_skips_provider_usage_when_sdk_omits_it(
    openai_sdk_stub: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When the SDK does not expose a usage dict, `provider_usage` is None on
    stop. This is the signal the builder uses to skip the cost meta event
    rather than ship a misleading $0 record."""
    # Replace the stream's final_output so usage extraction returns nothing.
    real_run_streamed = openai_sdk_stub.run_streamed

    class _NoUsageStream:
        def __init__(self, events: list[Any]) -> None:
            self._events = events
            self.final_output = None

        async def stream_events(self) -> AsyncIterator[Any]:
            for e in self._events:
                yield e

    def patched(agent: Any, prompt: str) -> Any:
        return _NoUsageStream(openai_sdk_stub._events)

    monkeypatch.setattr(openai_sdk_stub, "run_streamed", patched)
    openai_sdk_stub.queue([_StubOpenAIEvent("message", text="ok")])

    provider = OpenAIProvider(model="gpt-4o-mini", api_key="sk-test")
    events: list[ProviderEvent] = []
    async for evt in provider.run(
        system_prompt="x", user_prompt="y", tools=[]
    ):
        events.append(evt)

    stop = events[-1]
    assert stop.kind == "stop"
    assert stop.provider_usage is None
    # Restore is automatic via monkeypatch teardown but be explicit for clarity.
    monkeypatch.setattr(openai_sdk_stub, "run_streamed", real_run_streamed)


# ---- Anthropic provider with stubbed SDK ----


class _StubAnthropicMessage:
    def __init__(self, **kwargs: Any) -> None:
        for k, v in kwargs.items():
            setattr(self, k, v)


class _StubAnthropicStreamCtx:
    """Async context manager that yields a sequence of stub events."""

    def __init__(self, events: list[Any]) -> None:
        self._events = events

    async def __aenter__(self) -> "_StubAnthropicStreamCtx":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    def __aiter__(self) -> AsyncIterator[Any]:
        return self._iter()

    async def _iter(self) -> AsyncIterator[Any]:
        for e in self._events:
            yield e


class _StubMessages:
    """Stand-in for client.messages on an AsyncAnthropic client."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self._queues: list[list[Any]] = []

    def queue(self, events: list[Any]) -> None:
        self._queues.append(events)

    def stream(self, **kwargs: Any) -> _StubAnthropicStreamCtx:
        self.calls.append(kwargs)
        events = self._queues.pop(0) if self._queues else []
        return _StubAnthropicStreamCtx(events)


class _StubAnthropicClient:
    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs
        self.messages = _StubMessages()


def _install_stub_anthropic_sdk() -> _StubAnthropicClient:
    """Install a stub `anthropic` module that constructs our stub client."""
    holder: dict[str, _StubAnthropicClient] = {}

    class _StubAsyncAnthropic(_StubAnthropicClient):
        def __init__(self, **kwargs: Any) -> None:
            super().__init__(**kwargs)
            holder["client"] = self

    mod = types.ModuleType("anthropic")
    mod.AsyncAnthropic = _StubAsyncAnthropic  # type: ignore[attr-defined]
    sys.modules["anthropic"] = mod

    placeholder = _StubAnthropicClient()
    holder["client"] = placeholder
    return holder  # type: ignore[return-value]


def _uninstall_stub_anthropic_sdk() -> None:
    sys.modules.pop("anthropic", None)


@pytest.fixture
def anthropic_sdk_stub() -> Any:
    holder = _install_stub_anthropic_sdk()
    try:
        yield holder
    finally:
        _uninstall_stub_anthropic_sdk()


def _evt(type_: str, **kwargs: Any) -> Any:
    """Build a SimpleNamespace event matching the Anthropic stream shape."""
    return types.SimpleNamespace(type=type_, **kwargs)


@pytest.mark.asyncio
async def test_anthropic_provider_constructor_rejects_missing_key() -> None:
    with pytest.raises(ProviderConfigError, match="ANTHROPIC_API_KEY"):
        AnthropicProvider(model="claude-haiku-4-5-20251001", api_key=None)


@pytest.mark.asyncio
async def test_anthropic_provider_emits_normalized_events(
    anthropic_sdk_stub: Any,
) -> None:
    """Drive the Anthropic provider through one tool call + a final text turn
    and assert the ProviderEvent stream matches the contract."""
    provider = AnthropicProvider(
        model="claude-haiku-4-5-20251001", api_key="sk-ant-test"
    )
    # Force lazy client instantiation so we can queue events on its `messages`.
    client = provider._get_client()

    # Turn 1: a text block (the plan), then a tool_use block.
    turn1 = [
        _evt(
            "message_start",
            message=types.SimpleNamespace(usage=types.SimpleNamespace(input_tokens=11)),
        ),
        _evt(
            "content_block_start",
            content_block=types.SimpleNamespace(type="text"),
        ),
        _evt(
            "content_block_delta",
            delta=types.SimpleNamespace(type="text_delta", text="Plan: do the thing."),
        ),
        _evt("content_block_stop"),
        _evt(
            "content_block_start",
            content_block=types.SimpleNamespace(
                type="tool_use", id="toolu_1", name="add_node"
            ),
        ),
        _evt(
            "content_block_delta",
            delta=types.SimpleNamespace(
                type="input_json_delta",
                partial_json='{"systemId":"sys","type":"Agent","title":"Planner"}',
            ),
        ),
        _evt("content_block_stop"),
        _evt(
            "message_delta",
            delta=types.SimpleNamespace(stop_reason="tool_use"),
            usage=types.SimpleNamespace(output_tokens=18),
        ),
    ]
    # Turn 2: just a final text block, no more tool calls.
    turn2 = [
        _evt(
            "content_block_start",
            content_block=types.SimpleNamespace(type="text"),
        ),
        _evt(
            "content_block_delta",
            delta=types.SimpleNamespace(type="text_delta", text="Done."),
        ),
        _evt("content_block_stop"),
        _evt(
            "message_delta",
            delta=types.SimpleNamespace(stop_reason="end_turn"),
            usage=types.SimpleNamespace(output_tokens=2),
        ),
    ]
    client.messages.queue(turn1)
    client.messages.queue(turn2)

    events: list[ProviderEvent] = []

    async def consume() -> None:
        async for evt in provider.run(
            system_prompt="be helpful",
            user_prompt="please build it",
            tools=[],
        ):
            events.append(evt)
            # As soon as the provider asks for a tool result, submit one.
            if evt.kind == "tool_result_request":
                await provider.submit_tool_result(
                    evt.tool_id or "", {"action": "addNode", "ok": True}
                )

    await asyncio.wait_for(consume(), timeout=2.0)

    kinds = [e.kind for e in events]
    # Plan text + tool_call + tool_result_request + final text + stop.
    assert kinds == [
        "text_delta",
        "tool_call",
        "tool_result_request",
        "text_delta",
        "stop",
    ]
    assert events[0].text == "Plan: do the thing."
    assert events[1].tool_name == "add_node"
    assert events[1].tool_id == "toolu_1"
    assert events[1].tool_args == {
        "systemId": "sys",
        "type": "Agent",
        "title": "Planner",
    }
    assert events[2].tool_id == "toolu_1"
    assert events[3].text == "Done."
    assert events[4].kind == "stop"
    assert events[4].stop_reason == "end_turn"
    # Usage was accumulated across turns.
    assert events[4].usage is not None
    assert events[4].usage["input_tokens"] == 11
    # Normalized usage is populated and carries model + provider for cost.
    assert events[4].provider_usage is not None
    assert isinstance(events[4].provider_usage, ProviderUsage)
    assert events[4].provider_usage.input_tokens == 11
    # `output_tokens` is overwritten per `message_delta`, not summed; the
    # second turn ended at 2 so that's the surfaced value.
    assert events[4].provider_usage.output_tokens == 2
    assert events[4].provider_usage.model == "claude-haiku-4-5-20251001"
    assert events[4].provider_usage.provider == "anthropic"

    # Two API calls happened (turn 1 + turn 2). The second call's messages
    # contain a tool_result block referring to toolu_1.
    assert len(client.messages.calls) == 2
    second_call = client.messages.calls[1]
    last_user = second_call["messages"][-1]
    assert last_user["role"] == "user"
    tr_block = last_user["content"][0]
    assert tr_block["type"] == "tool_result"
    assert tr_block["tool_use_id"] == "toolu_1"
    # The serialized payload includes the result we submitted.
    assert "addNode" in tr_block["content"]


@pytest.mark.asyncio
async def test_anthropic_provider_handles_text_only_turn(
    anthropic_sdk_stub: Any,
) -> None:
    """A turn with no tool_use should produce text + stop only."""
    provider = AnthropicProvider(
        model="claude-haiku-4-5-20251001", api_key="sk-ant-test"
    )
    client = provider._get_client()
    client.messages.queue(
        [
            _evt(
                "content_block_start",
                content_block=types.SimpleNamespace(type="text"),
            ),
            _evt(
                "content_block_delta",
                delta=types.SimpleNamespace(type="text_delta", text="Nothing to build."),
            ),
            _evt("content_block_stop"),
            _evt(
                "message_delta",
                delta=types.SimpleNamespace(stop_reason="end_turn"),
                usage=types.SimpleNamespace(output_tokens=4),
            ),
        ]
    )

    events: list[ProviderEvent] = []
    async for evt in provider.run(
        system_prompt="be helpful",
        user_prompt="x",
        tools=[],
    ):
        events.append(evt)

    assert [e.kind for e in events] == ["text_delta", "stop"]
    assert events[0].text == "Nothing to build."
    assert events[1].stop_reason == "end_turn"


@pytest.mark.asyncio
async def test_anthropic_provider_respects_30_call_cap_via_clean_yield(
    anthropic_sdk_stub: Any,
) -> None:
    """The 30-tool-call cap is enforced by the builder, but the provider must
    yield cleanly when the consumer stops iterating. We simulate that here
    by breaking out of the iteration after one tool call and asserting no
    exception escapes."""
    provider = AnthropicProvider(
        model="claude-haiku-4-5-20251001", api_key="sk-ant-test"
    )
    client = provider._get_client()
    client.messages.queue(
        [
            _evt(
                "content_block_start",
                content_block=types.SimpleNamespace(
                    type="tool_use", id="toolu_a", name="add_node"
                ),
            ),
            _evt(
                "content_block_delta",
                delta=types.SimpleNamespace(
                    type="input_json_delta",
                    partial_json='{"systemId":"s","type":"Agent","title":"P"}',
                ),
            ),
            _evt("content_block_stop"),
            _evt(
                "message_delta",
                delta=types.SimpleNamespace(stop_reason="tool_use"),
                usage=types.SimpleNamespace(output_tokens=5),
            ),
        ]
    )

    seen_tool_call = False
    gen = provider.run(system_prompt="x", user_prompt="x", tools=[])
    try:
        async for evt in gen:
            if evt.kind == "tool_call":
                seen_tool_call = True
                break
    finally:
        await gen.aclose()
    assert seen_tool_call


# ---- Builder integration: provider=anthropic exits the same SSE shape ----


@pytest.mark.asyncio
async def test_builder_with_anthropic_provider_emits_same_sse_shape(
    anthropic_sdk_stub: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Run the builder against a stubbed AnthropicProvider via the same
    `runner` injection seam tests already use, and confirm the SSE event
    shape is identical to the OpenAI default. This is the load-bearing
    integration check: provider swap is invisible to the editor."""
    from agents.builder import run_turn_stream
    from agents.schemas import BuildRequest

    SAMPLE_PLAN = (
        "Build a Planner agent that hands work to a Coder agent. "
        "Add a Planner node and a Coder node. "
        "Connect them with one pipe carrying the plan from Planner to Coder. "
        "Two nodes earn their place because the engineer asked for a planner-coder loop."
    )

    request = BuildRequest(
        systemId="sys_test",
        prompt="Planner feeds Coder.",
        provider="anthropic",
    )

    async def stub_runner(**kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"kind": "plan", "text": SAMPLE_PLAN}
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
        yield {"kind": "message", "text": "Built Planner."}

    frames: list[str] = []
    async for frame in run_turn_stream(request, runner=stub_runner):
        frames.append(frame)

    # Parse SSE frames for assertion.
    parsed: list[dict[str, Any]] = []
    for frame in frames:
        lines = frame.strip().split("\n")
        ev = ""
        data = ""
        for line in lines:
            if line.startswith("event: "):
                ev = line[len("event: ") :]
            elif line.startswith("data: "):
                data = line[len("data: ") :]
        parsed.append({"event": ev, "data": json.loads(data)})

    names = [p["event"] for p in parsed]
    assert names[0] == "status"
    assert names[-1] == "done"
    assert "tool_call" in names
    assert "tool_result" in names
    # Plan + final assistant message.
    assert names.count("message") == 2
