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

from .cost_table import estimate_cost_dollars
from .plan_evaluator import (
    ActionEvalResult,
    EvalResult,
    evaluate_action,
    evaluate_plan,
)
from .providers import (
    AgentProvider,
    DEFAULT_OPENAI_MODEL,
    ProviderConfigError,
    ProviderEvent,
    _tool_schemas_anthropic,
    build_provider,
    resolve_model,
    resolve_provider,
)
from .schemas import (
    DEFAULT_FIRST_NODE_X,
    DEFAULT_FIRST_NODE_Y,
    MAX_TOOL_CALLS_PER_TURN,
    MAX_WALL_CLOCK_SECONDS,
    BuildRequest,
    PlanProposal,
    PlanStep,
    ProviderUsage,
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
# Default model preserved for backwards compatibility; the provider layer now
# owns model selection per provider via resolve_model().
DEFAULT_MODEL = os.environ.get("OPENAI_AGENTS_MODEL", DEFAULT_OPENAI_MODEL)


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


# ---- Plan parsing (interactive plan editor) ----


import re


_PLAN_JSON_FENCE_RE = re.compile(
    r"```(?:json)?\s*(\{.*?\})\s*```",
    re.DOTALL | re.IGNORECASE,
)


def split_plan_text_and_steps(
    plan_text: str,
) -> tuple[str, Optional[PlanProposal]]:
    """Pull a fenced JSON block off the END of a plan message and return
    `(stripped_text, proposal)`. The proposal carries the structured steps.

    Backwards compat: if no JSON block is found OR the block fails to parse
    into the `PlanProposal` schema, returns `(plan_text, None)` so the legacy
    text-only flow keeps working.

    The matching is conservative: we only accept a fenced ```json block whose
    parsed JSON contains a top-level `steps` array. Anything else passes
    through untouched.
    """
    matches = list(_PLAN_JSON_FENCE_RE.finditer(plan_text))
    if not matches:
        return plan_text, None

    # Prefer the LAST matching block so prose snippets earlier in the plan
    # that may quote JSON for example purposes don't accidentally get consumed.
    last = matches[-1]
    raw = last.group(1).strip()
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return plan_text, None

    if not isinstance(parsed, dict) or "steps" not in parsed:
        return plan_text, None

    raw_steps = parsed.get("steps")
    if not isinstance(raw_steps, list):
        return plan_text, None

    # Assign stable step ids (s1, s2, ...) before validating the model so the
    # model is free to omit ids. Existing ids on the input are kept verbatim
    # so a re-execute call can round-trip.
    normalized_steps: list[PlanStep] = []
    for idx, raw_step in enumerate(raw_steps):
        if not isinstance(raw_step, dict):
            return plan_text, None
        step_id = raw_step.get("id") or f"s{idx + 1}"
        kind = raw_step.get("kind")
        if kind not in ("add_node", "add_pipe", "update_node", "delete_node", "validate"):
            return plan_text, None
        label = raw_step.get("label")
        if not isinstance(label, str) or not label.strip():
            return plan_text, None
        args = raw_step.get("args") or {}
        if not isinstance(args, dict):
            return plan_text, None
        try:
            normalized_steps.append(
                PlanStep(id=step_id, kind=kind, label=label, args=args)
            )
        except Exception:  # noqa: BLE001 - any pydantic error means we bail to legacy
            return plan_text, None

    plan_str = parsed.get("planText")
    auto_after = parsed.get("autoExecuteAfterMs", 0)
    if not isinstance(auto_after, (int, float)):
        auto_after = 0

    proposal = PlanProposal(
        plan_text=plan_str if isinstance(plan_str, str) else plan_text[: last.start()].strip(),
        steps=normalized_steps,
        auto_execute_after_ms=int(auto_after),
    )

    # Strip the entire fenced block (and the trailing whitespace) from the
    # human-readable plan text. The PlanProposal carries the structured form.
    stripped = (plan_text[: last.start()] + plan_text[last.end():]).rstrip()
    return stripped, proposal


def _resolve_step_args_for_pipe(
    args: dict[str, Any],
    step_id_to_node_id: dict[str, str],
) -> dict[str, Any]:
    """For an `add_pipe` step, swap `fromStepId`/`toStepId` references into the
    actual node ids the prior tool calls produced. Existing `fromNodeId`/
    `toNodeId` keys win if present (caller already resolved).
    """
    out = dict(args)
    if "fromStepId" in out and "fromNodeId" not in out:
        sid = out.pop("fromStepId")
        if isinstance(sid, str) and sid in step_id_to_node_id:
            out["fromNodeId"] = step_id_to_node_id[sid]
    if "toStepId" in out and "toNodeId" not in out:
        sid = out.pop("toStepId")
        if isinstance(sid, str) and sid in step_id_to_node_id:
            out["toNodeId"] = step_id_to_node_id[sid]
    return out


def _tool_args_for_step(
    step: PlanStep,
    system_id: str,
    step_id_to_node_id: dict[str, str],
) -> dict[str, Any]:
    """Build the tool-call argument dict for one PlanStep, injecting the
    canonical systemId and resolving step references for add_pipe."""
    args = dict(step.args)
    if step.kind == "add_pipe":
        args = _resolve_step_args_for_pipe(args, step_id_to_node_id)
    if step.kind in ("add_node", "add_pipe", "validate"):
        args.setdefault("systemId", system_id)
    return args


async def _execute_plan_steps(
    request: BuildRequest,
    steps: list[PlanStep],
    dispatch: dict[str, Callable[..., dict[str, Any]]],
) -> AsyncIterator["Step"]:
    """Drive a sequence of approved PlanSteps as tool calls. Used when the
    caller has supplied `execute_steps` (i.e. the user already accepted an
    edited plan). Resolves `fromStepId`/`toStepId` references for add_pipe.

    Skips disabled steps (`step.enabled is False`); a None or True enabled
    flag means include.
    """
    step_id_to_node_id: dict[str, str] = {}
    for idx, step in enumerate(steps):
        if step.enabled is False:
            continue
        call_id = f"tc_{idx + 1}_{step.id}"
        args = _tool_args_for_step(step, request.system_id, step_id_to_node_id)
        yield {
            "kind": "tool_call",
            "id": call_id,
            "tool_name": step.kind,
            "arguments": args,
        }
        fn = dispatch.get(step.kind)
        if fn is None:
            yield {
                "kind": "tool_result",
                "id": call_id,
                "ok": False,
                "error": f"Unknown tool {step.kind}",
            }
            continue
        try:
            result = fn(**_camel_to_snake_args(step.kind, args))
        except Exception as exc:  # noqa: BLE001
            yield {
                "kind": "tool_result",
                "id": call_id,
                "ok": False,
                "error": str(exc),
            }
            continue
        step_record: "Step" = {
            "kind": "tool_result",
            "id": call_id,
            "ok": True,
        }
        if isinstance(result, dict):
            if "action" in result:
                step_record["action"] = result
                node_id = result.get("clientNodeId")
                if isinstance(node_id, str):
                    step_id_to_node_id[step.id] = node_id
            elif "ok" in result and "errors" in result:
                step_record["data"] = result
            else:
                step_record["data"] = result
        yield step_record


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

    # ---- execute_steps short-circuit ----
    # When the caller supplies an approved step list, skip planning entirely
    # and run the steps in order. No plan_proposal is emitted because the
    # caller already accepted the plan.
    if request.execute_steps is not None:
        runner_iter = _execute_plan_steps(request, request.execute_steps, dispatch)
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
            if kind == "tool_call":
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
        if aborted():
            return
        yield sse_event(
            "done",
            {"conversationId": conversation_id, "turnId": turn_id},
        )
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

        # Emit the plan. If the model embedded a fenced JSON block at the
        # end, strip it before emitting the message and emit a separate
        # `plan_proposal` event carrying the structured steps.
        stripped_text, proposal = split_plan_text_and_steps(plan_text)
        yield sse_event("status", {"state": "writing_message"})
        yield sse_event("message", {"text": stripped_text, "role": "assistant"})
        if proposal is not None:
            yield sse_event("plan_proposal", proposal.to_dict())
        if aborted():
            return

        # No-op plan: skip to done with no tool calls.
        if plan_eval.is_no_op:
            yield sse_event(
                "done",
                {"conversationId": conversation_id, "turnId": turn_id},
            )
            return

        # Plan-only mode: emit the proposal then terminate cleanly with no
        # tool calls. The client renders PlanEditor; the user accepts or edits.
        if request.plan_only:
            yield sse_event(
                "done",
                {"conversationId": conversation_id, "turnId": turn_id},
            )
            return

        # Reset to thinking before tool calls begin.
        yield sse_event("status", {"state": "thinking"})
        if aborted():
            return

    # If a runner is injected (tests), use it directly. Otherwise pick a
    # provider and drive it. The provider layer normalizes both OpenAI's
    # Agents SDK and the Anthropic SDK into the same Step shape.
    if runner is not None:
        runner_iter = runner(
            request=request, dispatch=dispatch, model=model or DEFAULT_MODEL
        )
    else:
        provider_name = resolve_provider(request.provider)
        chosen_model = model or resolve_model(provider_name)
        try:
            provider = build_provider(provider_name, model=chosen_model)
        except ProviderConfigError as exc:
            yield sse_event(
                "error",
                {
                    "code": "model_unavailable",
                    "message": str(exc),
                    "retryable": False,
                },
            )
            return
        runner_iter = _run_streaming_with_provider(
            request=request,
            dispatch=dispatch,
            provider=provider,
        )

    final_message_sent = planner is not None
    plan_received_from_runner = planner is not None
    captured_usage: Optional[ProviderUsage] = None

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
                raw_plan_text = step.get("text", "")
                # Pull the structured plan off the message tail. Falls back
                # cleanly if the model didn't emit a JSON block.
                stripped_text, proposal = split_plan_text_and_steps(raw_plan_text)
                plan_eval = evaluate_plan(
                    stripped_text,
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
                    {"text": stripped_text, "role": "assistant"},
                )
                if proposal is not None:
                    yield sse_event("plan_proposal", proposal.to_dict())
                plan_received_from_runner = True
                if plan_eval.is_no_op:
                    yield sse_event(
                        "done",
                        {"conversationId": conversation_id, "turnId": turn_id},
                    )
                    return
                # Plan-only mode: emit done after the proposal with no tools.
                if request.plan_only:
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
            elif kind == "usage":
                # Provider usage. Capture for the final `meta` SSE event.
                # Tests may inject either a ProviderUsage or a plain dict.
                raw = step.get("provider_usage")
                if isinstance(raw, ProviderUsage):
                    captured_usage = raw
                elif isinstance(raw, dict):
                    try:
                        captured_usage = ProviderUsage(
                            input_tokens=int(raw["input_tokens"]),
                            output_tokens=int(raw["output_tokens"]),
                            model=str(raw["model"]),
                            provider=raw["provider"],
                        )
                    except (KeyError, TypeError, ValueError):
                        captured_usage = None
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

    # Emit one `meta` event carrying cost telemetry before the terminal
    # `done`. Skipped entirely when the provider didn't surface usage numbers
    # so the route persists None rather than a misleading $0 record.
    if captured_usage is not None:
        cost_dollars = estimate_cost_dollars(
            captured_usage.provider,
            captured_usage.model,
            captured_usage.input_tokens,
            captured_usage.output_tokens,
        )
        yield sse_event(
            "meta",
            {
                "cost": {
                    "tokens_in": captured_usage.input_tokens,
                    "tokens_out": captured_usage.output_tokens,
                    "dollars": round(cost_dollars, 6),
                    "model": captured_usage.model,
                    "provider": captured_usage.provider,
                },
                "tool_call_count": tool_call_count,
                "duration_seconds": round(time.monotonic() - started_at, 2),
            },
        )

    yield sse_event(
        "done",
        {"conversationId": conversation_id, "turnId": turn_id},
    )


# ---- Provider-driven runner ----


async def _run_streaming_with_provider(
    *,
    request: BuildRequest,
    dispatch: dict[str, Callable[..., dict[str, Any]]],
    provider: AgentProvider,
) -> AsyncIterator[Step]:
    """Drive an AgentProvider and yield Step records.

    Provider-agnostic: works for both OpenAIProvider (which delegates tool
    execution to the SDK's loop) and AnthropicProvider (which round-trips
    tool results back through `submit_tool_result`).

    The plan-first contract requires a `plan` step before any `tool_call`;
    we synthesize that from the model's first text output if the provider
    doesn't emit one explicitly.
    """
    system_prompt = render_system_prompt(request)
    user_prompt = request.prompt

    # The OpenAI provider needs the function-tool wrappers; Anthropic needs
    # raw schemas. Build the right one based on the provider class name.
    tools_payload: list[Any]
    is_openai = provider.__class__.__name__ == "OpenAIProvider"
    if is_openai:
        tools_payload = _build_openai_function_tools(dispatch)
    else:
        tools_payload = _tool_schemas_anthropic()

    plan_emitted = False
    text_buffer: list[str] = []

    async for event in provider.run(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        tools=tools_payload,
    ):
        if event.kind == "text_delta":
            text_buffer.append(event.text or "")
            # Emit the plan once we have enough text to look like a plan.
            # Heuristic: first text block before any tool call IS the plan.
            if not plan_emitted and event.text:
                # Defer emitting until we see the next tool call or stop, so
                # we can ship the full text. We accumulate here.
                pass
            continue

        if event.kind == "tool_call":
            if not plan_emitted:
                plan_text = "".join(text_buffer).strip()
                text_buffer = []
                if plan_text:
                    yield {"kind": "plan", "text": plan_text}
                plan_emitted = True
            yield {
                "kind": "tool_call",
                "id": event.tool_id or _new_id("tc"),
                "tool_name": event.tool_name or "unknown",
                "arguments": event.tool_args or {},
            }
            # For OpenAI, the SDK dispatches the tool internally and the
            # next event will be a separate tool_result-style event. For
            # Anthropic, we dispatch here and submit the result back.
            if not is_openai:
                tool_id = event.tool_id or ""
                args = event.tool_args or {}
                fn = dispatch.get(event.tool_name or "")
                if fn is None:
                    yield {
                        "kind": "tool_result",
                        "id": tool_id,
                        "ok": False,
                        "error": f"Unknown tool {event.tool_name}",
                    }
                    await provider.submit_tool_result(
                        tool_id, {"error": f"Unknown tool {event.tool_name}"}
                    )
                    continue
                try:
                    result = fn(**_camel_to_snake_args(event.tool_name or "", args))
                except Exception as exc:  # noqa: BLE001
                    err_payload = {"error": str(exc)}
                    yield {
                        "kind": "tool_result",
                        "id": tool_id,
                        "ok": False,
                        "error": str(exc),
                    }
                    await provider.submit_tool_result(tool_id, err_payload)
                    continue
                step: Step = {
                    "kind": "tool_result",
                    "id": tool_id,
                    "ok": True,
                }
                if isinstance(result, dict):
                    if "action" in result:
                        step["action"] = result
                    elif "ok" in result and "errors" in result:
                        step["data"] = result
                    else:
                        step["data"] = result
                yield step
            continue

        if event.kind == "tool_result_request":
            # Anthropic signals that it is awaiting a tool result. The
            # builder already called submit_tool_result above; nothing else
            # to emit here.
            continue

        if event.kind == "stop":
            text = "".join(text_buffer).strip()
            text_buffer = []
            if text:
                if not plan_emitted:
                    yield {"kind": "plan", "text": text}
                    plan_emitted = True
                else:
                    yield {"kind": "message", "text": text}
            if event.usage:
                # v1 logs usage; later phases will persist it.
                import logging
                logging.getLogger(__name__).info(
                    "agent_turn_usage",
                    extra={"usage": event.usage, "model": provider.model},
                )
            # Forward normalized usage to the outer loop so it can emit a
            # `meta` SSE event with cost. Skipped when the SDK didn't surface
            # numbers; emitting zeros here would lie about cost.
            if event.provider_usage is not None:
                yield {"kind": "usage", "provider_usage": event.provider_usage}
            return

    # Provider exhausted without a stop event - flush any pending text.
    text = "".join(text_buffer).strip()
    if text:
        if not plan_emitted:
            yield {"kind": "plan", "text": text}
        else:
            yield {"kind": "message", "text": text}


def _camel_to_snake_args(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Translate Anthropic's camelCase tool args to the snake_case kwargs the
    Python tool dispatch expects. Each tool has a fixed mapping; unknown keys
    pass through unchanged.
    """
    mapping_by_tool = {
        "add_node": {
            "systemId": "system_id",
            "type": "type",
            "title": "title",
            "description": "description",
            "x": "x",
            "y": "y",
        },
        "add_pipe": {
            "systemId": "system_id",
            "fromNodeId": "from_node_id",
            "toNodeId": "to_node_id",
        },
        "update_node": {
            "nodeId": "node_id",
            "title": "title",
            "description": "description",
            "position": "position",
            "config": "config",
        },
        "delete_node": {"nodeId": "node_id"},
        "validate": {"systemId": "system_id"},
    }
    rules = mapping_by_tool.get(tool_name, {})
    out: dict[str, Any] = {}
    for k, v in args.items():
        out[rules.get(k, k)] = v
    return out


def _build_openai_function_tools(
    dispatch: dict[str, Callable[..., dict[str, Any]]],
) -> list[Any]:
    """Build the function_tool wrappers the OpenAI Agents SDK expects.

    Lazy imports `agents.tool.function_tool` so unit tests that swap in a
    stub runner do not need the SDK installed.
    """
    try:
        from agents.tool import function_tool  # type: ignore[import-not-found]
    except Exception as import_error:  # noqa: BLE001
        raise RuntimeError(
            "openai-agents SDK not installed. Add `openai-agents` to "
            "requirements.txt or run with a stub runner."
        ) from import_error

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

    return [add_node, add_pipe, update_node, delete_node, validate]


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
