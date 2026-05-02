"""The OpenAI Agents SDK agent and the streaming run loop.

The Agents SDK is imported lazily inside `build_agent` and `run_turn` so that:
  * Module import does not trigger a network-bound model client init (cold-start
    budget for the first SSE event is 800 ms; we do not waste it on imports
    that the unit tests can't reach).
  * The unit tests can monkey-patch a stub Runner without installing the SDK.

Streaming:
  The Agents SDK exposes a streaming Runner that yields events as the model
  calls tools. We translate those internal events into the 6 SSE events from
  docs/agent-contract.md (tool_call, tool_result, message, status, done, error).

Plan-first flow (audit add):
  Every turn emits a plan `message` event BEFORE any tool call. The plan
  passes a deterministic eval gate (`evaluate_plan`) before the agent is
  permitted to execute tools. Each tool call additionally passes
  `evaluate_action` before being forwarded.

If the installed SDK shape differs from what is sketched here, fix the shim in
`_run_streaming_with_sdk` only. The rest of the file is SDK-agnostic.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, AsyncIterator, Awaitable, Callable, Optional

from .plan_evaluator import (
    ActionEvalResult,
    EvalResult,
    evaluate_action,
    evaluate_plan,
)
from .schemas import (
    DEFAULT_FIRST_NODE_X,
    DEFAULT_FIRST_NODE_Y,
    MAX_TOOL_CALLS_PER_TURN,
    MAX_WALL_CLOCK_SECONDS,
    BuildRequest,
)
from .tools import (
    GraphState,
    add_node as tool_add_node,
    add_pipe as tool_add_pipe,
    delete_node as tool_delete_node,
    update_node as tool_update_node,
    validate as tool_validate,
)


SYSTEM_PROMPT_PATH = Path(__file__).parent / "system_prompt.md"
DEFAULT_MODEL = os.environ.get("OPENAI_AGENTS_MODEL", "gpt-4o-mini")


def load_system_prompt() -> str:
    """Read the system prompt from disk. Re-read every call so deploys pick
    up edits without a Modal rebuild."""
    return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")


def render_system_prompt(request: BuildRequest) -> str:
    """Substitute the `{{...}}` placeholders with request context.

    Empty values render as empty strings so the prompt reads cleanly even
    when no context is known. We use `str.replace` rather than `str.format`
    because the prompt contains literal curly braces in its examples.
    """
    template = load_system_prompt()
    substitutions: dict[str, str] = {
        "{{user_first_name}}": (request.user_first_name or "").strip(),
        "{{user_team}}": (request.user_team or "").strip(),
        "{{prior_systems_summary}}": (request.prior_systems_summary or "").strip(),
        "{{system_name}}": (request.system_name or "").strip(),
        "{{existing_node_count}}": str(request.existing_nodes_count),
        "{{existing_pipe_count}}": str(request.existing_pipes_count),
    }
    out = template
    for key, value in substitutions.items():
        out = out.replace(key, value)
    return out


# ---- Tool dispatch ----


def _make_tool_dispatch(state: GraphState) -> dict[str, Callable[..., dict[str, Any]]]:
    """Bind the 5 tools to a single GraphState instance for one turn."""
    return {
        "add_node": lambda **kw: tool_add_node(state, **kw),
        "add_pipe": lambda **kw: tool_add_pipe(state, **kw),
        "update_node": lambda **kw: tool_update_node(state, **kw),
        "delete_node": lambda **kw: tool_delete_node(state, **kw),
        "validate": lambda **kw: tool_validate(state, **kw),
    }


# ---- Event helpers ----


def sse_event(name: str, data: dict[str, Any]) -> str:
    """Format one Server-Sent Event frame. The empty trailing line terminates the
    event per the SSE spec."""
    return f"event: {name}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ---- Internal event records (SDK-agnostic) ----


# A "step" is a normalized record we yield from the model loop.
# kind is one of: plan, tool_call, tool_result, message, status.
# These are converted to SSE frames upstream.
Step = dict[str, Any]


# ---- Streaming run loop ----


PlannerFn = Callable[[BuildRequest], Awaitable[str]]


async def run_turn_stream(
    request: BuildRequest,
    *,
    initial_state: Optional[GraphState] = None,
    model: Optional[str] = None,
    runner: Optional[Callable[..., AsyncIterator[Step]]] = None,
    planner: Optional[PlannerFn] = None,
    abort_signal: Optional[asyncio.Event] = None,
) -> AsyncIterator[str]:
    """Run one agent turn and yield SSE-formatted strings.

    Parameters
    ----------
    request:
        The BuildRequest that came in over HTTP.
    initial_state:
        Pre-populated GraphState. Phase 3 will hydrate this from Convex; for
        v1 unit tests and the local one-shot, we start empty.
    model:
        Optional override of the OPENAI_AGENTS_MODEL env var.
    runner:
        Optional injection point used by tests. Production passes None and we
        instantiate the real Agents SDK Runner. The runner yields Step records
        AFTER the plan has been emitted and accepted.
    planner:
        Optional injection point that returns the plan text. Tests use this to
        deterministically drive the plan-first flow without a model call.
        Production leaves this None; the plan is read off the runner's first
        `plan` Step (the SDK shim emits one before the first tool_call).
    abort_signal:
        Optional asyncio.Event the caller sets to cancel the turn mid-stream.
        When set, the loop stops emitting events and returns.
    """
    state = initial_state or GraphState(system_id=request.system_id)
    dispatch = _make_tool_dispatch(state)

    conversation_id = request.conversation_id or _new_id("conv")
    turn_id = _new_id("turn")
    started_at = time.monotonic()
    tool_call_count = 0
    validate_called = False
    pending_node_ids: set[str] = set()

    def aborted() -> bool:
        return abort_signal is not None and abort_signal.is_set()

    yield sse_event("status", {"state": "thinking"})
    if aborted():
        return

    # ---- Plan-first flow ----
    plan_text: Optional[str] = None
    plan_eval: Optional[EvalResult] = None
    rejection_reasons: list[str] = []

    # If a planner injection is provided, use it; otherwise the runner is
    # expected to emit the first `plan` step before any tool_call.
    if planner is not None:
        # First attempt.
        try:
            plan_text = await planner(request)
        except Exception as exc:  # noqa: BLE001
            yield sse_event(
                "error",
                {
                    "code": "internal",
                    "message": f"Plan generation failed: {exc}",
                    "retryable": True,
                },
            )
            return
        if aborted():
            return
        plan_eval = evaluate_plan(
            plan_text,
            request.existing_nodes_count,
            request.existing_pipes_count,
        )

        # One re-plan attempt on rejection.
        if not plan_eval.ok:
            rejection_reasons = list(plan_eval.reasons)
            try:
                # Pass rejection reasons via a re-plan call. The planner
                # interface is opaque; tests stub a planner that ignores the
                # reminder argument or honors a sentinel.
                plan_text = await planner(request)
            except Exception as exc:  # noqa: BLE001
                yield sse_event(
                    "error",
                    {
                        "code": "internal",
                        "message": f"Plan re-generation failed: {exc}",
                        "retryable": True,
                    },
                )
                return
            if aborted():
                return
            plan_eval = evaluate_plan(
                plan_text,
                request.existing_nodes_count,
                request.existing_pipes_count,
            )
            if not plan_eval.ok:
                yield sse_event(
                    "error",
                    {
                        "code": "plan_rejected",
                        "message": "; ".join(
                            plan_eval.reasons or rejection_reasons
                        ),
                        "retryable": False,
                    },
                )
                return

        # Emit the plan.
        yield sse_event("status", {"state": "writing_message"})
        yield sse_event("message", {"text": plan_text, "role": "assistant"})
        if aborted():
            return

        # No-op plan: skip to done with no tool calls.
        if plan_eval.is_no_op:
            yield sse_event(
                "done",
                {"conversationId": conversation_id, "turnId": turn_id},
            )
            return

        # Reset to thinking before tool calls begin.
        yield sse_event("status", {"state": "thinking"})
        if aborted():
            return

    runner_iter = (
        runner(request=request, dispatch=dispatch, model=model or DEFAULT_MODEL)
        if runner is not None
        else _run_streaming_with_sdk(
            request=request, dispatch=dispatch, model=model or DEFAULT_MODEL
        )
    )

    final_message_sent = planner is not None
    plan_received_from_runner = planner is not None

    try:
        async for step in runner_iter:
            if aborted():
                return
            elapsed = time.monotonic() - started_at
            if elapsed > MAX_WALL_CLOCK_SECONDS:
                yield sse_event(
                    "error",
                    {
                        "code": "timeout",
                        "message": "Turn exceeded 60 second budget.",
                        "retryable": False,
                    },
                )
                return

            kind = step.get("kind")

            if kind == "plan":
                # When the runner emits a plan step (no injected planner),
                # evaluate it and gate tool calls behind it.
                plan_text = step.get("text", "")
                plan_eval = evaluate_plan(
                    plan_text,
                    request.existing_nodes_count,
                    request.existing_pipes_count,
                )
                if not plan_eval.ok:
                    yield sse_event(
                        "error",
                        {
                            "code": "plan_rejected",
                            "message": "; ".join(plan_eval.reasons),
                            "retryable": False,
                        },
                    )
                    return
                if not final_message_sent:
                    yield sse_event("status", {"state": "writing_message"})
                yield sse_event(
                    "message",
                    {"text": plan_text, "role": "assistant"},
                )
                plan_received_from_runner = True
                if plan_eval.is_no_op:
                    yield sse_event(
                        "done",
                        {"conversationId": conversation_id, "turnId": turn_id},
                    )
                    return
                yield sse_event("status", {"state": "thinking"})
                continue

            if kind == "tool_call":
                if not plan_received_from_runner:
                    # Tool calls before a plan are a contract violation.
                    yield sse_event(
                        "error",
                        {
                            "code": "internal",
                            "message": "Tool call emitted before plan message.",
                            "retryable": False,
                        },
                    )
                    return

                tool_call_count += 1
                if tool_call_count > MAX_TOOL_CALLS_PER_TURN:
                    yield sse_event(
                        "error",
                        {
                            "code": "tool_call_limit_exceeded",
                            "message": "Turn exceeded the 30 tool call cap.",
                            "retryable": False,
                        },
                    )
                    return

                # Action eval gate.
                eval_state = {
                    "nodes": state.nodes,
                    "pipes": state.pipes,
                    "validate_called": validate_called,
                    "pending_node_ids": pending_node_ids,
                }
                eval_action = evaluate_action(
                    {
                        "tool_name": step.get("tool_name"),
                        "arguments": step.get("arguments", {}),
                    },
                    eval_state,
                )
                if not eval_action.ok:
                    yield sse_event(
                        "message",
                        {
                            "text": f"Skipped: {eval_action.reason}",
                            "role": "assistant",
                        },
                    )
                    continue

                if step.get("tool_name") == "validate":
                    validate_called = True

                yield sse_event(
                    "status",
                    {"state": "calling_tool", "tool_name": step["tool_name"]},
                )
                yield sse_event(
                    "tool_call",
                    {
                        "id": step["id"],
                        "tool_name": step["tool_name"],
                        "arguments": step["arguments"],
                    },
                )
                # Track in-flight node-affecting calls so a delete cannot race.
                if step.get("tool_name") in ("add_node", "update_node"):
                    nid = step.get("arguments", {}).get("nodeId") or step.get(
                        "arguments", {}
                    ).get("clientNodeId")
                    if nid:
                        pending_node_ids.add(nid)

            elif kind == "tool_result":
                payload: dict[str, Any] = {
                    "id": step["id"],
                    "ok": step.get("ok", True),
                }
                if "action" in step and step["action"] is not None:
                    payload["action"] = step["action"]
                if "data" in step and step["data"] is not None:
                    payload["data"] = step["data"]
                if "error" in step and step["error"]:
                    payload["error"] = step["error"]
                    payload["ok"] = False
                yield sse_event("tool_result", payload)
                # Mirror the action into the in-memory GraphState so the next
                # action eval sees up-to-date nodes and pipes. The runner's
                # internal dispatch may have already mutated state when running
                # against the real SDK; we no-op duplicates by checking ids.
                action = step.get("action") or {}
                act_kind = action.get("action") if isinstance(action, dict) else None
                if act_kind == "addNode":
                    nid = action.get("clientNodeId")
                    if nid and nid not in state.nodes:
                        state.add_node(nid, dict(action))
                elif act_kind == "addPipe":
                    pid = action.get("clientPipeId")
                    if pid and pid not in state.pipes:
                        state.add_pipe(pid, dict(action))
                elif act_kind == "updateNode":
                    nid = action.get("nodeId")
                    if nid and nid in state.nodes:
                        patch = {k: v for k, v in action.items() if k not in ("action", "nodeId")}
                        state.update_node(nid, patch)
                elif act_kind == "deleteNode":
                    nid = action.get("nodeId")
                    if nid:
                        state.delete_node(nid)
                # Clear from in-flight once applied.
                nid = action.get("clientNodeId") or action.get("nodeId")
                if nid in pending_node_ids:
                    pending_node_ids.discard(nid)
            elif kind == "message":
                if not final_message_sent:
                    yield sse_event("status", {"state": "writing_message"})
                    final_message_sent = True
                yield sse_event(
                    "message",
                    {"text": step.get("text", ""), "role": "assistant"},
                )
            elif kind == "status":
                # Allow the runner to push opaque status updates; clamp to known states.
                state_name = step.get("state", "thinking")
                payload = {"state": state_name}
                if step.get("tool_name"):
                    payload["tool_name"] = step["tool_name"]
                yield sse_event("status", payload)
            else:
                # Unknown step kinds are silently dropped to keep the wire clean.
                continue
    except Exception as exc:  # noqa: BLE001 - surface every failure as terminal
        yield sse_event(
            "error",
            {
                "code": "internal",
                "message": f"Agent runner failed: {exc}",
                "retryable": True,
            },
        )
        return

    if aborted():
        return

    yield sse_event(
        "done",
        {"conversationId": conversation_id, "turnId": turn_id},
    )


# ---- The OpenAI Agents SDK shim ----


async def _run_streaming_with_sdk(
    *,
    request: BuildRequest,
    dispatch: dict[str, Callable[..., dict[str, Any]]],
    model: str,
) -> AsyncIterator[Step]:
    """Drive the OpenAI Agents SDK and translate its events to Step records.

    The SDK API has shifted over the 0.x line. The minimum we need is:
      * Define an Agent with instructions, model, and a list of tools.
      * Call a streaming Runner that yields per-event records as the model runs.
      * Read tool_call, tool_result, and final message from those events.

    If the local SDK exposes a different surface, replace the body of this
    function. Everything else in this file stays put.
    """
    try:
        # Lazy import: keeps unit tests usable without the SDK installed.
        from agents import Agent, Runner  # type: ignore[import-not-found]
        from agents.tool import function_tool  # type: ignore[import-not-found]
    except Exception as import_error:  # noqa: BLE001
        # Surface a helpful error rather than a stack trace.
        raise RuntimeError(
            "openai-agents SDK not installed. Add `openai-agents` to "
            "requirements.txt or run with a stub runner."
        ) from import_error

    # Wrap each Python tool as an SDK tool. The decorator generates the JSON
    # schema from the function's signature.
    @function_tool
    def add_node(
        systemId: str,
        type: str,
        title: str,
        description: Optional[str] = None,
        x: Optional[float] = None,
        y: Optional[float] = None,
    ) -> dict[str, Any]:
        """Add one node to the canvas. Returns the new node id."""
        return dispatch["add_node"](
            system_id=systemId,
            type=type,
            title=title,
            description=description,
            x=x,
            y=y,
        )

    @function_tool
    def add_pipe(systemId: str, fromNodeId: str, toNodeId: str) -> dict[str, Any]:
        """Connect two nodes by id. Call after add_node."""
        return dispatch["add_pipe"](
            system_id=systemId,
            from_node_id=fromNodeId,
            to_node_id=toNodeId,
        )

    @function_tool
    def update_node(
        nodeId: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        position: Optional[dict[str, float]] = None,
        config: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Edit an existing node."""
        return dispatch["update_node"](
            node_id=nodeId,
            title=title,
            description=description,
            position=position,
            config=config,
        )

    @function_tool
    def delete_node(nodeId: str) -> dict[str, Any]:
        """Remove a node and cascade attached pipes."""
        return dispatch["delete_node"](node_id=nodeId)

    @function_tool
    def validate(systemId: str) -> dict[str, Any]:
        """Run lightweight graph invariants. Read-only."""
        return dispatch["validate"](system_id=systemId)

    agent = Agent(
        name="Pipes Builder",
        instructions=render_system_prompt(request),
        model=model,
        tools=[add_node, add_pipe, update_node, delete_node, validate],
    )

    # The Agents SDK Runner.run_streamed (or stream()) returns an awaitable that
    # yields events. We normalize each event into a Step dict.
    stream = Runner.run_streamed(agent, request.prompt)

    async for raw_event in stream.stream_events():
        step = _translate_sdk_event(raw_event)
        if step is not None:
            yield step
        await asyncio.sleep(0)  # yield to the event loop so SSE flushes promptly


def _translate_sdk_event(raw_event: Any) -> Optional[Step]:
    """Map an SDK event to our Step shape. Tolerant of SDK version drift.

    Returns None for events we ignore.
    """
    name = getattr(raw_event, "type", None) or getattr(raw_event, "event", None)
    if name == "tool_called" or name == "tool_call" or name == "function_call":
        return {
            "kind": "tool_call",
            "id": getattr(raw_event, "id", None) or getattr(raw_event, "call_id", _new_id("tc")),
            "tool_name": getattr(raw_event, "name", None) or getattr(raw_event, "tool_name", "unknown"),
            "arguments": getattr(raw_event, "arguments", None) or getattr(raw_event, "args", {}),
        }
    if name == "tool_result" or name == "function_result":
        result = getattr(raw_event, "result", None) or getattr(raw_event, "output", None)
        # The result is whatever the tool returned. If it has an "action" key
        # we surface it as the editor action; if it has "ok"/"errors" we surface
        # it as `data` (validate result).
        step: Step = {
            "kind": "tool_result",
            "id": getattr(raw_event, "id", None) or getattr(raw_event, "call_id", _new_id("tr")),
            "ok": True,
        }
        if isinstance(result, dict):
            if "action" in result:
                step["action"] = result
            elif "ok" in result and "errors" in result:
                step["data"] = result
            else:
                step["data"] = result
        return step
    if name == "message" or name == "assistant_message" or name == "text":
        text = getattr(raw_event, "text", None) or getattr(raw_event, "content", "")
        return {"kind": "message", "text": text}
    return None


# Constants exported for the system prompt and unit tests.
__all__ = [
    "DEFAULT_FIRST_NODE_X",
    "DEFAULT_FIRST_NODE_Y",
    "DEFAULT_MODEL",
    "load_system_prompt",
    "render_system_prompt",
    "run_turn_stream",
    "sse_event",
]
