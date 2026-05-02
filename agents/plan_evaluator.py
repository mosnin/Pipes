"""Deterministic eval gates for the builder agent.

Two gates run BEFORE the model's output is forwarded to the editor:

1. `evaluate_plan` runs after the agent emits its plan paragraph and BEFORE the
   first tool call is allowed. Cheap regex-and-counting checks catch dumb
   plans the model would otherwise spend tool-call budget executing.

2. `evaluate_action` runs before each individual tool call is forwarded.
   Catches self-loops, duplicate edges, missing endpoints, off-canvas
   coordinates, and overlong arguments.

Pure Python. No model calls. No network. Deterministic. The Musk lens:
deterministic checks beat probabilistic models for catching dumb plans.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional


# Voice blacklist mirrors docs/audience.md and the system prompt.
BANNED_WORDS: tuple[str, ...] = (
    "platform",
    "solution",
    "leverage",
    "empower",
    "seamless",
    "unlock",
    "robust",
    "holistic",
    "cutting-edge",
    "world-class",
    "best-in-class",
)

# Plan length bounds (words).
PLAN_MIN_WORDS: int = 30
PLAN_MAX_WORDS: int = 400

# Node-count bounds.
FRESH_CANVAS_MIN_NODES: int = 2
FRESH_CANVAS_MAX_NODES: int = 15
ITERATION_MIN_NEW_NODES: int = 0
ITERATION_MAX_NEW_NODES: int = 5

# Connection-keywords: any of these in the plan implies the agent intends to
# wire nodes together. A system without flow is not a system.
CONNECTION_TERMS: tuple[str, ...] = (
    "pipe",
    "pipes",
    "connection",
    "connections",
    "connect",
    "connects",
    "connected",
    "arrow",
    "arrows",
    "feeds into",
    "feeds",
    "flows to",
    "flows into",
    "flow",
    "->",
    "edge",
    "edges",
    "wires",
    "wired",
    "links",
    "linked",
    "routes to",
)

NO_OP_PHRASES: tuple[str, ...] = (
    "nothing to build",
    "i will not change anything",
    "no nodes need to be added",
    "no changes needed",
    "no change needed",
)


# Action eval limits.
TITLE_MAX_LEN: int = 60
DESCRIPTION_MAX_LEN: int = 240
COORD_MIN: float = 0.0
COORD_MAX: float = 4000.0
COLLISION_MANHATTAN: float = 80.0


@dataclass
class EvalResult:
    """Result of `evaluate_plan`. `ok=True` means the plan may proceed.

    `is_no_op=True` means the plan declared nothing to build; the runner
    short-circuits to a clean `done` with zero tool calls.
    """

    ok: bool
    reasons: list[str] = field(default_factory=list)
    is_no_op: bool = False


@dataclass
class ActionEvalResult:
    """Result of `evaluate_action` for a single tool call."""

    ok: bool
    reason: Optional[str] = None


# ---- Plan evaluation ----


def _word_count(text: str) -> int:
    return len([w for w in text.split() if w.strip()])


def _count_node_mentions(text: str) -> int:
    """Heuristic: count node mentions in the plan paragraph.

    We look for two patterns:
      * Capitalized noun phrases preceding the literal word `node` or `agent`
        (e.g. `Planner agent`, `Router node`).
      * Lines that follow `Add a`, `Create a`, `Then a`, or bullet markers like
        `- ` followed by a capitalized token.

    The count is approximate. The eval gate uses it as a sanity bound, not as
    a parser; the model still owns the decision of how many nodes to draw.
    """
    lower = text.lower()
    count = 0

    # Pattern 1: word followed by " node" or " agent" or other type tokens.
    type_tokens = (
        "node",
        "agent",
        "tool",
        "model",
        "queue",
        "router",
        "trigger",
        "datastore",
        "decision",
        "loop",
        "monitor",
        "guardrail",
        "input",
        "output",
        "memory",
        "prompt",
    )
    for token in type_tokens:
        # Count occurrences as standalone words.
        count += len(re.findall(rf"\b{re.escape(token)}\b", lower))

    # Pattern 2: explicit imperative starters.
    starters = (
        r"\badd a\b",
        r"\bcreate a\b",
        r"\bcreate an\b",
        r"\bthen a\b",
        r"\bthen an\b",
        r"\binsert a\b",
        r"\bdrop in a\b",
    )
    for pat in starters:
        count += len(re.findall(pat, lower))

    return count


def _has_connection_term(text: str) -> bool:
    lower = text.lower()
    for term in CONNECTION_TERMS:
        if term in lower:
            return True
    return False


def _is_no_op(text: str) -> bool:
    lower = text.lower()
    for phrase in NO_OP_PHRASES:
        if phrase in lower:
            return True
    return False


def _find_banned_words(text: str) -> list[str]:
    lower = text.lower()
    found: list[str] = []
    for word in BANNED_WORDS:
        # Whole-word match. Hyphenated banned words are matched as substrings.
        if "-" in word:
            if word in lower:
                found.append(word)
        else:
            if re.search(rf"\b{re.escape(word)}\b", lower):
                found.append(word)
    return found


def evaluate_plan(
    plan_text: str,
    existing_nodes_count: int,
    existing_pipes_count: int,
) -> EvalResult:
    """Run deterministic checks against the model's plan paragraph.

    Returns `EvalResult { ok, reasons, is_no_op }`.

    Order of checks: no-op detection runs first because a no-op plan should
    short-circuit cleanly without triggering length/banned-word complaints.
    """
    reasons: list[str] = []

    # (d) No-op detection: short-circuits to a clean `done`.
    if _is_no_op(plan_text):
        return EvalResult(ok=True, reasons=[], is_no_op=True)

    # (e) Banned-phrase scan.
    banned = _find_banned_words(plan_text)
    if banned:
        reasons.append(
            f"Plan uses banned words: {', '.join(sorted(set(banned)))}."
        )

    # (a) Length sanity.
    word_count = _word_count(plan_text)
    if word_count < PLAN_MIN_WORDS:
        reasons.append(
            f"Plan is too short ({word_count} words; min {PLAN_MIN_WORDS})."
        )
    elif word_count > PLAN_MAX_WORDS:
        reasons.append(
            f"Plan is too long ({word_count} words; max {PLAN_MAX_WORDS})."
        )

    # (b) Node-count sanity.
    node_mentions = _count_node_mentions(plan_text)
    is_iteration = existing_nodes_count > 0
    if is_iteration:
        if not (
            ITERATION_MIN_NEW_NODES <= node_mentions <= ITERATION_MAX_NEW_NODES
        ):
            reasons.append(
                f"Iteration plan mentions {node_mentions} nodes; expected "
                f"{ITERATION_MIN_NEW_NODES} to {ITERATION_MAX_NEW_NODES} when "
                f"editing an existing canvas."
            )
    else:
        if not (
            FRESH_CANVAS_MIN_NODES <= node_mentions <= FRESH_CANVAS_MAX_NODES
        ):
            reasons.append(
                f"Fresh-canvas plan mentions {node_mentions} nodes; expected "
                f"{FRESH_CANVAS_MIN_NODES} to {FRESH_CANVAS_MAX_NODES}."
            )

    # (c) Connectivity sanity. Single-node inserts are exempt.
    is_single_node = node_mentions == 1
    if not is_single_node and not _has_connection_term(plan_text):
        reasons.append(
            "Plan does not name any pipe, connection, or flow between nodes."
        )

    return EvalResult(ok=len(reasons) == 0, reasons=reasons, is_no_op=False)


# ---- Action evaluation ----


def _manhattan(a: tuple[float, float], b: tuple[float, float]) -> float:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def _node_position(node: dict[str, Any]) -> Optional[tuple[float, float]]:
    """Return (x, y) for a node entry, or None when the node was added without
    explicit coordinates."""
    if "position" in node and isinstance(node["position"], dict):
        pos = node["position"]
        if "x" in pos and "y" in pos:
            return (float(pos["x"]), float(pos["y"]))
    if "x" in node and "y" in node:
        return (float(node["x"]), float(node["y"]))
    return None


def _coord_in_bounds(value: float) -> bool:
    return COORD_MIN <= value <= COORD_MAX


def _collides(
    new_pos: tuple[float, float],
    nodes: dict[str, dict[str, Any]],
    skip_node_id: Optional[str] = None,
) -> bool:
    for nid, node in nodes.items():
        if skip_node_id is not None and nid == skip_node_id:
            continue
        existing = _node_position(node)
        if existing is None:
            continue
        if _manhattan(new_pos, existing) < COLLISION_MANHATTAN:
            return True
    return False


def evaluate_action(
    action: dict[str, Any],
    current_state: dict[str, Any],
) -> ActionEvalResult:
    """Run deterministic checks on a single tool call before forwarding it.

    `action` is the tool call payload: `{ tool_name: str, arguments: dict }`.
    `current_state` exposes:
      * `nodes`: dict[node_id, node_payload]
      * `pipes`: dict[pipe_id, pipe_payload]
      * `validate_called`: bool (whether validate already ran this turn)
      * `pending_node_ids`: set[str] (in-flight tool_results not yet applied)
    """
    tool = action.get("tool_name")
    args = action.get("arguments", {}) or {}
    nodes: dict[str, dict[str, Any]] = current_state.get("nodes", {})
    pipes: dict[str, dict[str, Any]] = current_state.get("pipes", {})

    if tool == "add_node":
        title = args.get("title", "")
        description = args.get("description", "")
        if not isinstance(title, str) or not title.strip():
            return ActionEvalResult(False, "add_node title is empty.")
        if len(title) > TITLE_MAX_LEN:
            return ActionEvalResult(
                False, f"add_node title exceeds {TITLE_MAX_LEN} chars."
            )
        if not isinstance(description, str) or not description.strip():
            return ActionEvalResult(
                False, "add_node description is empty; one causal sentence required."
            )
        if len(description) > DESCRIPTION_MAX_LEN:
            return ActionEvalResult(
                False, f"add_node description exceeds {DESCRIPTION_MAX_LEN} chars."
            )
        x = args.get("x")
        y = args.get("y")
        if x is not None and not _coord_in_bounds(float(x)):
            return ActionEvalResult(
                False, f"add_node x={x} is out of bounds (0..4000)."
            )
        if y is not None and not _coord_in_bounds(float(y)):
            return ActionEvalResult(
                False, f"add_node y={y} is out of bounds (0..4000)."
            )
        if x is not None and y is not None:
            if _collides((float(x), float(y)), nodes):
                return ActionEvalResult(
                    False,
                    f"add_node position ({x},{y}) collides with an existing node.",
                )
        return ActionEvalResult(True)

    if tool == "add_pipe":
        from_id = args.get("fromNodeId") or args.get("from_node_id")
        to_id = args.get("toNodeId") or args.get("to_node_id")
        if not from_id or not to_id:
            return ActionEvalResult(
                False, "add_pipe is missing fromNodeId or toNodeId."
            )
        if from_id not in nodes:
            return ActionEvalResult(
                False, f"add_pipe references missing source node {from_id}."
            )
        if to_id not in nodes:
            return ActionEvalResult(
                False, f"add_pipe references missing target node {to_id}."
            )
        if from_id == to_id:
            return ActionEvalResult(False, "add_pipe would create a self-loop.")
        for pipe in pipes.values():
            f = pipe.get("fromNodeId") or pipe.get("from_node_id")
            t = pipe.get("toNodeId") or pipe.get("to_node_id")
            if f == from_id and t == to_id:
                return ActionEvalResult(
                    False,
                    f"add_pipe duplicates an existing edge {from_id}->{to_id}.",
                )
        return ActionEvalResult(True)

    if tool == "update_node":
        node_id = args.get("nodeId") or args.get("node_id")
        if not node_id or node_id not in nodes:
            return ActionEvalResult(
                False, f"update_node references missing node {node_id}."
            )
        position = args.get("position")
        if position is not None:
            if not isinstance(position, dict):
                return ActionEvalResult(
                    False, "update_node position must be an object."
                )
            x = position.get("x")
            y = position.get("y")
            if x is None or y is None:
                return ActionEvalResult(
                    False, "update_node position must include x and y."
                )
            if not _coord_in_bounds(float(x)) or not _coord_in_bounds(float(y)):
                return ActionEvalResult(
                    False,
                    f"update_node position ({x},{y}) is out of bounds (0..4000).",
                )
            if _collides((float(x), float(y)), nodes, skip_node_id=node_id):
                return ActionEvalResult(
                    False,
                    f"update_node position ({x},{y}) collides with another node.",
                )
        return ActionEvalResult(True)

    if tool == "delete_node":
        node_id = args.get("nodeId") or args.get("node_id")
        if not node_id or node_id not in nodes:
            return ActionEvalResult(
                False, f"delete_node references missing node {node_id}."
            )
        pending: set[str] = current_state.get("pending_node_ids", set())
        if node_id in pending:
            return ActionEvalResult(
                False,
                f"delete_node {node_id} is referenced by an in-flight tool_result.",
            )
        return ActionEvalResult(True)

    if tool == "validate":
        if current_state.get("validate_called", False):
            return ActionEvalResult(
                False, "validate already ran this turn; allowed at most once."
            )
        return ActionEvalResult(True)

    return ActionEvalResult(False, f"Unknown tool {tool}.")


__all__ = [
    "BANNED_WORDS",
    "EvalResult",
    "ActionEvalResult",
    "evaluate_plan",
    "evaluate_action",
]
