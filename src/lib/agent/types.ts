// Typed surface for the SSE protocol declared in docs/agent-contract.md.
// The 6 events are the entire contract between the client and /api/agent/build.

import type { EditorGraphAction } from "@/components/editor/editor_state";

export type AgentToolName = "add_node" | "add_pipe" | "update_node" | "delete_node" | "validate";

export type AgentStatusState = "thinking" | "calling_tool" | "writing_message";

export type AgentErrorCode =
  | "tool_call_limit_exceeded"
  | "timeout"
  | "auth_required"
  | "rate_limited"
  | "internal"
  | "model_unavailable";

// Per-event payloads. Mirrors agent-contract.md sections 3.x.
export type ToolCallEvent = {
  id: string;
  tool_name: AgentToolName;
  arguments: Record<string, unknown>;
};

export type ValidateResult = {
  ok: boolean;
  errors: Array<{ nodeId?: string; pipeId?: string; message: string }>;
};

export type ToolResultEvent = {
  id: string;
  ok: boolean;
  action?: EditorGraphAction;
  error?: string;
  data?: ValidateResult | Record<string, unknown>;
};

export type MessageEvent = {
  text: string;
  role: "assistant";
};

export type StatusEvent = {
  state: AgentStatusState;
  tool_name?: AgentToolName;
};

export type DoneEvent = {
  conversationId: string;
  turnId: string;
};

export type ErrorEvent = {
  code: AgentErrorCode | string;
  message: string;
  retryable: boolean;
};

// Discriminated union over the 6 events.
export type AgentEvent =
  | { type: "tool_call"; data: ToolCallEvent }
  | { type: "tool_result"; data: ToolResultEvent }
  | { type: "message"; data: MessageEvent }
  | { type: "status"; data: StatusEvent }
  | { type: "done"; data: DoneEvent }
  | { type: "error"; data: ErrorEvent };

export type AgentBuildRequest = {
  systemId: string;
  prompt: string;
  conversationId?: string;
};
