"""The 5 agent tools.

Each tool is a pure function. It validates its arguments via Pydantic, then
returns a dict that mirrors the EditorGraphAction shape consumed by the Next.js
optimistic queue (src/components/editor/editor_state.ts). The runner streams
those dicts on the `tool_result` SSE event so the canvas can apply them
immediately.

`validate` is the exception: it returns a read-only result that the agent uses
to write its final message.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from .schemas import (
    AddNodeArgs,
    AddPipeArgs,
    DeleteNodeArgs,
    UpdateNodeArgs,
    ValidateArgs,
    ValidateResult,
    ValidationError,
)


def _short_id(prefix: str) -> str:
    """Return `<prefix>_<8 hex>`. Stable, opaque, JSON-safe."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


# ---- The graph state the tools mutate during a turn ----


@dataclass
class GraphState:
    """In-memory mirror of the graph the agent is editing.

    The runner seeds this with whatever the existing system already contains
    (Phase 3 wires that read). For v1 unit tests we start empty.
    """

    system_id: str
    nodes: dict[str, dict[str, Any]] = field(default_factory=dict)
    pipes: dict[str, dict[str, Any]] = field(default_factory=dict)

    def add_node(self, node_id: str, payload: dict[str, Any]) -> None:
        self.nodes[node_id] = payload

    def add_pipe(self, pipe_id: str, payload: dict[str, Any]) -> None:
        self.pipes[pipe_id] = payload

    def update_node(self, node_id: str, patch: dict[str, Any]) -> None:
        if node_id in self.nodes:
            self.nodes[node_id].update(patch)

    def delete_node(self, node_id: str) -> list[str]:
        """Remove the node and cascade to attached pipes. Returns deleted pipe ids."""
        deleted_pipes: list[str] = []
        for pid, pipe in list(self.pipes.items()):
            if pipe.get("fromNodeId") == node_id or pipe.get("toNodeId") == node_id:
                del self.pipes[pid]
                deleted_pipes.append(pid)
        self.nodes.pop(node_id, None)
        return deleted_pipes


# ---- Tool implementations ----


def add_node(
    state: GraphState,
    *,
    system_id: str,
    type: str,
    title: str,
    description: Optional[str] = None,
    x: Optional[float] = None,
    y: Optional[float] = None,
) -> dict[str, Any]:
    """Create a node. Returns an EditorGraphAction-shaped dict.

    The caller (the Agents SDK) gets the dict on the tool_result event. The
    `clientNodeId` is what the model can pass to subsequent add_pipe calls.
    """
    args = AddNodeArgs(
        systemId=system_id,
        type=type,
        title=title,
        description=description,
        x=x,
        y=y,
    )
    client_node_id = _short_id("tmp")
    payload: dict[str, Any] = {
        "systemId": args.system_id,
        "type": args.type,
        "title": args.title,
        "clientNodeId": client_node_id,
    }
    if args.description is not None:
        payload["description"] = args.description
    if args.x is not None:
        payload["x"] = args.x
    if args.y is not None:
        payload["y"] = args.y
    state.add_node(client_node_id, payload)
    return {"action": "addNode", **payload}


def add_pipe(
    state: GraphState,
    *,
    system_id: str,
    from_node_id: str,
    to_node_id: str,
) -> dict[str, Any]:
    """Connect two existing nodes. Returns an EditorGraphAction-shaped dict."""
    args = AddPipeArgs(
        systemId=system_id, fromNodeId=from_node_id, toNodeId=to_node_id
    )
    client_pipe_id = _short_id("tmp")
    payload: dict[str, Any] = {
        "systemId": args.system_id,
        "fromNodeId": args.from_node_id,
        "toNodeId": args.to_node_id,
        "clientPipeId": client_pipe_id,
    }
    state.add_pipe(client_pipe_id, payload)
    return {"action": "addPipe", **payload}


def update_node(
    state: GraphState,
    *,
    node_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    position: Optional[dict[str, float]] = None,
    config: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Edit an existing node. Returns an EditorGraphAction-shaped dict."""
    pos = None
    if position is not None:
        pos = {"x": float(position["x"]), "y": float(position["y"])}
    args = UpdateNodeArgs(
        nodeId=node_id,
        title=title,
        description=description,
        position=pos,
        config=config,
    )
    payload: dict[str, Any] = {"nodeId": args.node_id}
    patch: dict[str, Any] = {}
    if args.title is not None:
        payload["title"] = args.title
        patch["title"] = args.title
    if args.description is not None:
        payload["description"] = args.description
        patch["description"] = args.description
    if args.position is not None:
        payload["position"] = {"x": args.position.x, "y": args.position.y}
        patch["position"] = payload["position"]
    if args.config is not None:
        payload["config"] = args.config
        patch["config"] = args.config
    state.update_node(args.node_id, patch)
    return {"action": "updateNode", **payload}


def delete_node(state: GraphState, *, node_id: str) -> dict[str, Any]:
    """Remove a node. Returns an EditorGraphAction-shaped dict."""
    args = DeleteNodeArgs(nodeId=node_id)
    state.delete_node(args.node_id)
    return {"action": "deleteNode", "nodeId": args.node_id}


def validate(state: GraphState, *, system_id: str) -> dict[str, Any]:
    """Run lightweight invariants on the in-memory graph.

    V1 ports a minimum: no duplicate node ids, no pipes referencing missing
    nodes, no self-loops. The full TypeScript validator (port-direction,
    cycle, reachability, subsystem interface) needs port data the agent does
    not own; those checks belong on the Next.js side after the flush.
    """
    args = ValidateArgs(systemId=system_id)
    errors: list[ValidationError] = []

    seen_node_ids: set[str] = set()
    for nid in state.nodes:
        if nid in seen_node_ids:
            errors.append(
                ValidationError(message=f"Duplicate node id {nid}.", nodeId=nid)
            )
        seen_node_ids.add(nid)

    for pid, pipe in state.pipes.items():
        from_id = pipe.get("fromNodeId")
        to_id = pipe.get("toNodeId")
        if from_id is None or from_id not in state.nodes:
            errors.append(
                ValidationError(
                    message=f"Pipe {pid} references missing source node {from_id}.",
                    pipeId=pid,
                )
            )
        if to_id is None or to_id not in state.nodes:
            errors.append(
                ValidationError(
                    message=f"Pipe {pid} references missing target node {to_id}.",
                    pipeId=pid,
                )
            )
        if from_id is not None and from_id == to_id:
            errors.append(
                ValidationError(
                    message=f"Pipe {pid} connects a node to itself.",
                    pipeId=pid,
                )
            )

    result = ValidateResult(ok=len(errors) == 0, errors=errors)
    # The system_id parameter is part of the contract surface even though the
    # local state is already keyed; keep the arg validated.
    _ = args
    return result.to_dict()


__all__ = [
    "GraphState",
    "add_node",
    "add_pipe",
    "update_node",
    "delete_node",
    "validate",
]
