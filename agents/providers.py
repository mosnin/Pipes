"""Provider abstraction for the agent runner.

Two implementations live here:

* `OpenAIProvider` wraps the existing OpenAI Agents SDK call. It is the default
  and preserves the exact shim that `builder._run_streaming_with_sdk` used to
  implement directly.
* `AnthropicProvider` calls the Anthropic Python SDK with native tool-use. It
  drives the same 5 tools and yields the same `ProviderEvent` records.

Both providers expose the same interface so the builder's downstream logic
(plan eval, action eval, SSE framing, the 30-tool-call cap) is identical
regardless of model. The builder consumes `ProviderEvent` records and never
sees raw OpenAI or Anthropic events.

Tool-result round-trip:
  Each provider owns the wire-level convention for sending tool results back
  to the model. The builder calls `provider.submit_tool_result(tool_id, result)`
  after dispatching the call locally; the provider knows how to plumb that
  back into the streaming loop so the model can decide whether to continue or
  stop.

Key validation:
  Constructors raise `ProviderConfigError` when the relevant API key is
  missing. The builder catches this and emits an SSE `error` event with code
  `model_unavailable`.

Cost telemetry:
  The final `ProviderEvent(kind="stop")` carries `usage` (a dict with the
  provider's own token counters). v1 logs it; later phases will persist it
  on agent_turns.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Callable, Literal, Optional

from .schemas import ProviderUsage


logger = logging.getLogger(__name__)


# ---- Public types ----


ProviderName = Literal["openai", "anthropic"]


DEFAULT_PROVIDER: ProviderName = "openai"
DEFAULT_OPENAI_MODEL: str = "gpt-4o-mini"
# A current production Anthropic model. Operators can override via
# ANTHROPIC_AGENTS_MODEL to e.g. claude-sonnet-4-6 for stronger reasoning.
DEFAULT_ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"


class ProviderConfigError(RuntimeError):
    """Raised when a provider cannot be constructed (missing API key, etc.).

    The builder catches this and emits an SSE `error` event with code
    `model_unavailable`.
    """


@dataclass
class ProviderEvent:
    """Normalized event emitted by every provider implementation.

    The builder consumes these directly. Each event maps to at most one of the
    SSE frames defined in docs/agent-contract.md.

    `kind` values:
      * `text_delta` - incremental message text. Carries `text`.
      * `tool_call` - the model wants to call a tool. Carries
         `tool_name`, `tool_args`, `tool_id`.
      * `tool_result_request` - the provider is signaling that it is ready to
         receive a tool result via `submit_tool_result`. Used by Anthropic;
         OpenAI's SDK handles tool execution internally and never emits this.
      * `stop` - terminal event. Carries `stop_reason` and optional `usage`.
    """

    kind: Literal["text_delta", "tool_call", "tool_result_request", "stop"]
    text: Optional[str] = None
    tool_name: Optional[str] = None
    tool_args: Optional[dict[str, Any]] = None
    tool_id: Optional[str] = None
    stop_reason: Optional[str] = None
    # Raw token-counter dict from the SDK. Kept for backwards-compat callers
    # (logging) and for any tests that pin to the old shape.
    usage: Optional[dict[str, Any]] = None
    # Normalized usage record carrying `model` and `provider` next to the
    # input/output token counts. Populated only on terminal `stop` events
    # when the SDK actually surfaced numbers. None means "skip cost emission"
    # to the builder; never invent zeros here.
    provider_usage: Optional[ProviderUsage] = None


# ---- Tool schemas (provider-agnostic) ----


def _tool_schemas_anthropic() -> list[dict[str, Any]]:
    """Return the 5 tool schemas in Anthropic format.

    Each tool gets a {name, description, input_schema} entry. Field names
    mirror the OpenAI wrappers in builder._run_streaming_with_sdk.
    """
    return [
        {
            "name": "add_node",
            "description": (
                "Add one node to the canvas. Call before add_pipe. Returns the new node id."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "systemId": {"type": "string"},
                    "type": {"type": "string"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                },
                "required": ["systemId", "type", "title"],
            },
        },
        {
            "name": "add_pipe",
            "description": "Connect two nodes by id. Call after add_node.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "systemId": {"type": "string"},
                    "fromNodeId": {"type": "string"},
                    "toNodeId": {"type": "string"},
                },
                "required": ["systemId", "fromNodeId", "toNodeId"],
            },
        },
        {
            "name": "update_node",
            "description": "Edit an existing node by id.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "nodeId": {"type": "string"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "position": {
                        "type": "object",
                        "properties": {
                            "x": {"type": "number"},
                            "y": {"type": "number"},
                        },
                        "required": ["x", "y"],
                    },
                    "config": {"type": "object"},
                },
                "required": ["nodeId"],
            },
        },
        {
            "name": "delete_node",
            "description": "Remove a node and cascade attached pipes.",
            "input_schema": {
                "type": "object",
                "properties": {"nodeId": {"type": "string"}},
                "required": ["nodeId"],
            },
        },
        {
            "name": "validate",
            "description": "Run lightweight graph invariants. Read-only. Allowed once per turn.",
            "input_schema": {
                "type": "object",
                "properties": {"systemId": {"type": "string"}},
                "required": ["systemId"],
            },
        },
    ]


# ---- Provider base class ----


class AgentProvider:
    """Abstract provider. Subclasses drive a model and yield `ProviderEvent`s.

    Subclass contract:
      * `__init__(model, api_key)` validates the key. Raise
        `ProviderConfigError` if missing.
      * `run(system_prompt, user_prompt, tools, callbacks)` is an async
        generator that yields `ProviderEvent` records.
      * `submit_tool_result(tool_id, result)` is awaited by the builder after
        each tool dispatch so the provider can return the result to the model.
    """

    def __init__(self, model: str, api_key: Optional[str]) -> None:
        self.model = model
        self.api_key = api_key

    async def run(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        tools: list[dict[str, Any]],
        callbacks: Optional[dict[str, Callable[..., Any]]] = None,
    ) -> AsyncIterator[ProviderEvent]:
        raise NotImplementedError
        yield  # pragma: no cover - keeps the type checker honest

    async def submit_tool_result(self, tool_id: str, result: Any) -> None:
        raise NotImplementedError


# ---- Helpers ----


def resolve_provider(
    request_provider: Optional[str],
    env: Optional[dict[str, str]] = None,
) -> ProviderName:
    """Resolve which provider to use.

    Priority:
      1. `request_provider` (per-request from BuildRequest body).
      2. `PIPES_AGENT_PROVIDER` env var (deploy-wide default).
      3. Hardcoded default `openai`.
    """
    candidate = (request_provider or "").strip().lower()
    if not candidate:
        env_map = env if env is not None else os.environ
        candidate = (env_map.get("PIPES_AGENT_PROVIDER") or "").strip().lower()
    if candidate in ("openai", "anthropic"):
        return candidate  # type: ignore[return-value]
    return DEFAULT_PROVIDER


def resolve_model(provider: ProviderName, env: Optional[dict[str, str]] = None) -> str:
    """Pick the model env var matching the provider."""
    env_map = env if env is not None else os.environ
    if provider == "anthropic":
        return env_map.get("ANTHROPIC_AGENTS_MODEL", DEFAULT_ANTHROPIC_MODEL)
    return env_map.get("OPENAI_AGENTS_MODEL", DEFAULT_OPENAI_MODEL)


def build_provider(
    provider: ProviderName,
    *,
    model: Optional[str] = None,
    env: Optional[dict[str, str]] = None,
) -> AgentProvider:
    """Construct the provider, validating its API key.

    Raises `ProviderConfigError` if the relevant key is missing. The model is
    resolved from env if not given.
    """
    env_map = env if env is not None else os.environ
    chosen_model = model or resolve_model(provider, env_map)
    if provider == "anthropic":
        api_key = env_map.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ProviderConfigError(
                "ANTHROPIC_API_KEY is missing. Set it before selecting "
                "provider=anthropic."
            )
        return AnthropicProvider(model=chosen_model, api_key=api_key)
    api_key = env_map.get("OPENAI_API_KEY")
    if not api_key:
        raise ProviderConfigError(
            "OPENAI_API_KEY is missing. Set it before running the agent."
        )
    return OpenAIProvider(model=chosen_model, api_key=api_key)


# ---- OpenAI provider ----


class OpenAIProvider(AgentProvider):
    """Delegates to the OpenAI Agents SDK.

    The SDK handles the tool-use loop internally. We translate its events to
    `ProviderEvent` records. Tool results never come back through
    `submit_tool_result` here because the SDK calls our Python wrappers
    directly during its own loop.
    """

    def __init__(self, model: str, api_key: Optional[str]) -> None:
        super().__init__(model=model, api_key=api_key)

    async def run(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        tools: list[dict[str, Any]],
        callbacks: Optional[dict[str, Callable[..., Any]]] = None,
    ) -> AsyncIterator[ProviderEvent]:
        """Drive the OpenAI Agents SDK and yield ProviderEvents.

        `tools` here is a list of objects already wrapped by the
        `function_tool` decorator (the builder constructs them so it can wire
        up its dispatch table). The `callbacks` dict is unused for OpenAI but
        is part of the abstraction so AnthropicProvider can plug in a tool
        executor.
        """
        try:
            from agents import Agent, Runner  # type: ignore[import-not-found]
        except Exception as import_error:  # noqa: BLE001
            raise RuntimeError(
                "openai-agents SDK not installed. Add `openai-agents` to "
                "requirements.txt or run with a stub runner."
            ) from import_error

        agent = Agent(
            name="Pipes Builder",
            instructions=system_prompt,
            model=self.model,
            tools=tools,
        )

        stream = Runner.run_streamed(agent, user_prompt)
        usage: dict[str, Any] = {}
        async for raw_event in stream.stream_events():
            event = _translate_openai_event(raw_event)
            if event is not None:
                yield event
            await asyncio.sleep(0)

        # Best-effort usage extraction. The SDK exposes this on the final
        # response object on most versions; we tolerate absence.
        final = getattr(stream, "final_output", None) or getattr(stream, "result", None)
        if final is not None:
            for attr in ("usage", "_usage", "tokens"):
                value = getattr(final, attr, None)
                if isinstance(value, dict):
                    usage = value
                    break
        provider_usage = _build_openai_provider_usage(usage, self.model)
        yield ProviderEvent(
            kind="stop",
            stop_reason="end_turn",
            usage=usage,
            provider_usage=provider_usage,
        )

    async def submit_tool_result(self, tool_id: str, result: Any) -> None:
        # The OpenAI Agents SDK runs the loop and dispatches tools itself.
        # Tool results are returned synchronously from our wrappers; this
        # method is a no-op for parity with the abstract interface.
        return None


def _build_openai_provider_usage(
    usage: dict[str, Any], model: str
) -> Optional[ProviderUsage]:
    """Normalize an OpenAI usage dict into a `ProviderUsage`.

    The SDK exposes either `prompt_tokens`/`completion_tokens` or newer
    `input_tokens`/`output_tokens` keys depending on version. We accept both.
    Returns `None` when neither is present (mocked clients, very old SDK)
    so the builder skips the cost meta event rather than emit zeros.
    """
    if not isinstance(usage, dict) or not usage:
        return None
    in_tokens = usage.get("input_tokens")
    if in_tokens is None:
        in_tokens = usage.get("prompt_tokens")
    out_tokens = usage.get("output_tokens")
    if out_tokens is None:
        out_tokens = usage.get("completion_tokens")
    if not isinstance(in_tokens, int) or not isinstance(out_tokens, int):
        return None
    return ProviderUsage(
        input_tokens=in_tokens,
        output_tokens=out_tokens,
        model=model,
        provider="openai",
    )


def _translate_openai_event(raw_event: Any) -> Optional[ProviderEvent]:
    """Map an OpenAI Agents SDK event to a ProviderEvent.

    Tolerant of SDK version drift. Mirrors the old _translate_sdk_event in
    builder.py but emits ProviderEvent records.
    """
    name = getattr(raw_event, "type", None) or getattr(raw_event, "event", None)
    if name in ("tool_called", "tool_call", "function_call"):
        args = getattr(raw_event, "arguments", None) or getattr(raw_event, "args", {}) or {}
        if isinstance(args, str):
            try:
                args = json.loads(args)
            except json.JSONDecodeError:
                args = {}
        return ProviderEvent(
            kind="tool_call",
            tool_id=(
                getattr(raw_event, "id", None)
                or getattr(raw_event, "call_id", None)
                or _new_id("tc")
            ),
            tool_name=(
                getattr(raw_event, "name", None)
                or getattr(raw_event, "tool_name", "unknown")
            ),
            tool_args=args if isinstance(args, dict) else {},
        )
    if name in ("message", "assistant_message", "text"):
        text = getattr(raw_event, "text", None) or getattr(raw_event, "content", "")
        if text:
            return ProviderEvent(kind="text_delta", text=text)
    return None


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ---- Anthropic provider ----


class AnthropicProvider(AgentProvider):
    """Drives the Anthropic Python SDK with native tool-use.

    The model emits text and tool_use blocks; we yield ProviderEvents. After
    a tool_call, the builder dispatches the tool locally then calls
    `submit_tool_result`. We feed that result back as a `tool_result` block in
    the next user turn and resume streaming.

    The 5 tool schemas are passed in Anthropic format. The builder owns the
    Python dispatch; this provider is purely a wire-level shim.
    """

    def __init__(self, model: str, api_key: Optional[str]) -> None:
        if not api_key:
            raise ProviderConfigError("ANTHROPIC_API_KEY is missing.")
        super().__init__(model=model, api_key=api_key)
        self._client = None  # lazy
        self._pending_results: dict[str, Any] = {}
        self._tool_result_event: asyncio.Event = asyncio.Event()
        # Filled in during run().
        self._messages: list[dict[str, Any]] = []
        self._system_prompt: str = ""
        self._tools: list[dict[str, Any]] = []
        self._usage: dict[str, Any] = {
            "input_tokens": 0,
            "output_tokens": 0,
        }

    def _get_client(self) -> Any:
        if self._client is None:
            try:
                import anthropic  # type: ignore[import-not-found]
            except Exception as import_error:  # noqa: BLE001
                raise RuntimeError(
                    "anthropic SDK not installed. Add `anthropic>=0.39` to "
                    "requirements.txt."
                ) from import_error
            self._client = anthropic.AsyncAnthropic(api_key=self.api_key)
        return self._client

    async def run(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        tools: list[dict[str, Any]],
        callbacks: Optional[dict[str, Callable[..., Any]]] = None,
    ) -> AsyncIterator[ProviderEvent]:
        """Drive Anthropic and yield ProviderEvents.

        `tools` here is the list of Anthropic-format tool schemas (see
        `_tool_schemas_anthropic`). `callbacks` is unused but part of the
        common interface.
        """
        self._system_prompt = system_prompt
        self._tools = tools
        self._messages = [
            {"role": "user", "content": [{"type": "text", "text": user_prompt}]}
        ]

        client = self._get_client()
        max_turns = 64  # one entry per model turn; the builder enforces 30 tool calls.
        for _ in range(max_turns):
            tool_uses: list[dict[str, Any]] = []
            assistant_blocks: list[dict[str, Any]] = []
            stop_reason: Optional[str] = None

            stream_ctx = client.messages.stream(
                model=self.model,
                max_tokens=4096,
                system=self._system_prompt,
                messages=self._messages,
                tools=self._tools,
            )

            async with stream_ctx as stream:
                current_tool: Optional[dict[str, Any]] = None
                current_tool_json: list[str] = []
                current_text: list[str] = []
                async for event in stream:
                    etype = getattr(event, "type", None)
                    if etype == "content_block_start":
                        block = getattr(event, "content_block", None)
                        block_type = getattr(block, "type", None)
                        if block_type == "tool_use":
                            current_tool = {
                                "id": getattr(block, "id", _new_id("toolu")),
                                "name": getattr(block, "name", "unknown"),
                            }
                            current_tool_json = []
                        elif block_type == "text":
                            current_text = []
                    elif etype == "content_block_delta":
                        delta = getattr(event, "delta", None)
                        delta_type = getattr(delta, "type", None)
                        if delta_type == "text_delta":
                            text = getattr(delta, "text", "") or ""
                            current_text.append(text)
                            if text:
                                yield ProviderEvent(kind="text_delta", text=text)
                        elif delta_type == "input_json_delta":
                            current_tool_json.append(
                                getattr(delta, "partial_json", "") or ""
                            )
                    elif etype == "content_block_stop":
                        if current_tool is not None:
                            try:
                                args_obj = (
                                    json.loads("".join(current_tool_json))
                                    if current_tool_json
                                    else {}
                                )
                            except json.JSONDecodeError:
                                args_obj = {}
                            tool_uses.append(
                                {
                                    "id": current_tool["id"],
                                    "name": current_tool["name"],
                                    "input": args_obj,
                                }
                            )
                            assistant_blocks.append(
                                {
                                    "type": "tool_use",
                                    "id": current_tool["id"],
                                    "name": current_tool["name"],
                                    "input": args_obj,
                                }
                            )
                            current_tool = None
                            current_tool_json = []
                        elif current_text:
                            assistant_blocks.append(
                                {"type": "text", "text": "".join(current_text)}
                            )
                            current_text = []
                    elif etype == "message_delta":
                        delta = getattr(event, "delta", None)
                        if delta is not None:
                            sr = getattr(delta, "stop_reason", None)
                            if sr is not None:
                                stop_reason = sr
                        usage_delta = getattr(event, "usage", None)
                        if usage_delta is not None:
                            output_tokens = getattr(usage_delta, "output_tokens", None)
                            if output_tokens is not None:
                                self._usage["output_tokens"] = int(output_tokens)
                    elif etype == "message_start":
                        message = getattr(event, "message", None)
                        usage = getattr(message, "usage", None)
                        if usage is not None:
                            input_tokens = getattr(usage, "input_tokens", None)
                            if input_tokens is not None:
                                self._usage["input_tokens"] += int(input_tokens)

            if not tool_uses:
                # End of conversation - no more tool calls requested.
                final_usage = dict(self._usage)
                yield ProviderEvent(
                    kind="stop",
                    stop_reason=stop_reason or "end_turn",
                    usage=final_usage,
                    provider_usage=_build_anthropic_provider_usage(
                        final_usage, self.model
                    ),
                )
                return

            # Append the assistant's turn so the next request includes it.
            self._messages.append({"role": "assistant", "content": assistant_blocks})

            # Emit each tool call and collect the results, then send all
            # tool_result blocks back as the next user turn.
            tool_result_blocks: list[dict[str, Any]] = []
            for tool_use in tool_uses:
                # Reset the per-call event so we can wait on it.
                self._tool_result_event = asyncio.Event()
                yield ProviderEvent(
                    kind="tool_call",
                    tool_id=tool_use["id"],
                    tool_name=tool_use["name"],
                    tool_args=tool_use["input"],
                )
                # Signal that we are awaiting a tool result.
                yield ProviderEvent(
                    kind="tool_result_request",
                    tool_id=tool_use["id"],
                )
                # Wait for the builder to call submit_tool_result.
                await self._tool_result_event.wait()
                result = self._pending_results.pop(tool_use["id"], None)
                tool_result_blocks.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use["id"],
                        "content": _serialize_tool_result(result),
                    }
                )

            self._messages.append({"role": "user", "content": tool_result_blocks})

        # Fell off the loop - too many turns.
        final_usage = dict(self._usage)
        yield ProviderEvent(
            kind="stop",
            stop_reason="max_turns",
            usage=final_usage,
            provider_usage=_build_anthropic_provider_usage(
                final_usage, self.model
            ),
        )

    async def submit_tool_result(self, tool_id: str, result: Any) -> None:
        """Builder calls this after dispatching a tool. We wake the run loop."""
        self._pending_results[tool_id] = result
        self._tool_result_event.set()


def _build_anthropic_provider_usage(
    usage: dict[str, Any], model: str
) -> Optional[ProviderUsage]:
    """Normalize the Anthropic usage dict into a `ProviderUsage`.

    Anthropic's stream surfaces input tokens on `message_start.usage` and
    output tokens incrementally via `message_delta.usage`. Both land on the
    builder's `self._usage` dict before we hit the stop event. If neither
    number was ever observed (purely mocked stream), we return None so the
    builder skips the cost meta event rather than emit zeros.
    """
    if not isinstance(usage, dict):
        return None
    in_tokens = usage.get("input_tokens")
    out_tokens = usage.get("output_tokens")
    if not isinstance(in_tokens, int) or not isinstance(out_tokens, int):
        return None
    if in_tokens == 0 and out_tokens == 0:
        return None
    return ProviderUsage(
        input_tokens=in_tokens,
        output_tokens=out_tokens,
        model=model,
        provider="anthropic",
    )


def _serialize_tool_result(result: Any) -> str:
    """Anthropic tool_result.content accepts a string or a list of content
    blocks. We serialize dicts to JSON so the model can read structured
    payloads (validate result, action dicts) without losing information."""
    if result is None:
        return ""
    if isinstance(result, str):
        return result
    try:
        return json.dumps(result, separators=(",", ":"))
    except (TypeError, ValueError):
        return str(result)


__all__ = [
    "AgentProvider",
    "AnthropicProvider",
    "DEFAULT_ANTHROPIC_MODEL",
    "DEFAULT_OPENAI_MODEL",
    "DEFAULT_PROVIDER",
    "OpenAIProvider",
    "ProviderConfigError",
    "ProviderEvent",
    "ProviderName",
    "build_provider",
    "resolve_model",
    "resolve_provider",
]
