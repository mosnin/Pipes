"""Pydantic models for the agent runner request, response, and event shapes.

These mirror the contract in docs/agent-contract.md. Field names use snake_case
on the Python side; SSE payloads serialize back to the exact JSON keys the
contract specifies (see `to_event_dict` helpers below).
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ---- Request ----


class BuildRequest(BaseModel):
    """Body of POST /api/agent/build forwarded by the Next.js route."""

    system_id: str = Field(..., alias="systemId")
    prompt: str
    conversation_id: Optional[str] = Field(default=None, alias="conversationId")
    # Optional: prior turns to seed history. The Next.js route may pass these.
    history: list[dict[str, Any]] = Field(default_factory=list)

    # Optional tailoring fields. The Next.js route will populate these once
    # Phase 3 wires user context and graph state through. The agent reads
    # them to substitute `{{...}}` placeholders in the system prompt.
    user_first_name: Optional[str] = Field(default=None, alias="userFirstName")
    user_team: Optional[str] = Field(default=None, alias="userTeam")
    prior_systems_summary: Optional[str] = Field(
        default=None, alias="priorSystemsSummary"
    )
    system_name: Optional[str] = Field(default=None, alias="systemName")
    existing_nodes_count: int = Field(default=0, alias="existingNodesCount")
    existing_pipes_count: int = Field(default=0, alias="existingPipesCount")

    model_config = {"populate_by_name": True}


# ---- Tool argument shapes (used both by Pydantic validation and tool schema) ----


class Position(BaseModel):
    x: float
    y: float


class AddNodeArgs(BaseModel):
    system_id: str = Field(..., alias="systemId")
    type: str
    title: str = Field(..., max_length=80)
    description: Optional[str] = Field(default=None, max_length=400)
    x: Optional[float] = None
    y: Optional[float] = None

    model_config = {"populate_by_name": True}


class AddPipeArgs(BaseModel):
    system_id: str = Field(..., alias="systemId")
    from_node_id: str = Field(..., alias="fromNodeId")
    to_node_id: str = Field(..., alias="toNodeId")

    model_config = {"populate_by_name": True}


class UpdateNodeArgs(BaseModel):
    node_id: str = Field(..., alias="nodeId")
    title: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = Field(default=None, max_length=400)
    position: Optional[Position] = None
    config: Optional[dict[str, Any]] = None

    model_config = {"populate_by_name": True}


class DeleteNodeArgs(BaseModel):
    node_id: str = Field(..., alias="nodeId")

    model_config = {"populate_by_name": True}


class ValidateArgs(BaseModel):
    system_id: str = Field(..., alias="systemId")

    model_config = {"populate_by_name": True}


# ---- Tool result payloads (the dict each tool returns) ----


class EditorGraphAction(BaseModel):
    """A subset of EditorGraphAction in src/components/editor/editor_state.ts.

    The agent emits addNode, updateNode, deleteNode, addPipe. validate is
    read-only and produces no action.
    """

    action: Literal["addNode", "addPipe", "updateNode", "deleteNode"]
    # Free-form because each action shape differs. Validators live in the
    # TypeScript editor; we trust that.
    payload: dict[str, Any] = Field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"action": self.action}
        out.update(self.payload)
        return out


class ValidationError(BaseModel):
    node_id: Optional[str] = Field(default=None, alias="nodeId")
    pipe_id: Optional[str] = Field(default=None, alias="pipeId")
    message: str

    model_config = {"populate_by_name": True}

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"message": self.message}
        if self.node_id is not None:
            d["nodeId"] = self.node_id
        if self.pipe_id is not None:
            d["pipeId"] = self.pipe_id
        return d


class ValidateResult(BaseModel):
    ok: bool
    errors: list[ValidationError] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"ok": self.ok, "errors": [e.to_dict() for e in self.errors]}


# ---- SSE event payloads ----


ToolName = Literal["add_node", "add_pipe", "update_node", "delete_node", "validate"]
ErrorCode = Literal[
    "tool_call_limit_exceeded",
    "timeout",
    "auth_required",
    "rate_limited",
    "internal",
    "model_unavailable",
]
StatusState = Literal["thinking", "calling_tool", "writing_message"]


class ToolCallEvent(BaseModel):
    id: str
    tool_name: ToolName
    arguments: dict[str, Any]


class ToolResultEvent(BaseModel):
    id: str
    ok: bool
    action: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    data: Optional[dict[str, Any]] = None


class MessageEvent(BaseModel):
    text: str
    role: Literal["assistant"] = "assistant"


class StatusEvent(BaseModel):
    state: StatusState
    tool_name: Optional[ToolName] = None


class DoneEvent(BaseModel):
    conversation_id: str = Field(..., alias="conversationId")
    turn_id: str = Field(..., alias="turnId")

    model_config = {"populate_by_name": True}

    def to_dict(self) -> dict[str, Any]:
        return {"conversationId": self.conversation_id, "turnId": self.turn_id}


class ErrorEvent(BaseModel):
    code: ErrorCode
    message: str
    retryable: bool


# ---- Limits ----


MAX_TOOL_CALLS_PER_TURN: int = 30
MAX_WALL_CLOCK_SECONDS: float = 60.0
DEFAULT_FIRST_NODE_X: float = 240.0
DEFAULT_FIRST_NODE_Y: float = 180.0
COL_STEP: float = 220.0
ROW_STEP: float = 140.0
