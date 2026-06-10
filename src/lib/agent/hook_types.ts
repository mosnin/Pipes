// Public surface for useAgentBuild, kept separate so consumers can import the
// types without pulling in the hook (and its React dependencies) at type time.

import type { AgentStatusState } from "@/lib/agent/types";
import type { PlanStep } from "@/lib/agent/plan-types";

export type AgentBuildState = "idle" | "connecting" | "running" | "stopped" | "error";

export type PlaceholderHint =
  | "idle"
  | "building" // first 5 s after submit, no event yet
  | "spinning_up" // 5 s elapsed, no event yet
  | "failed" // 30 s elapsed, treat as failed
  | "running"; // first event arrived, regular running state

export type AgentChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: string;
  streaming?: boolean;
};

export type AgentToolCallRecord = {
  id: string;
  toolName: string;
  argsLabel: string;
  ok?: boolean;
};

export type UseAgentBuildResult = {
  state: AgentBuildState;
  conversationId: string | undefined;
  messages: AgentChatMessage[];
  toolCalls: AgentToolCallRecord[];
  // `send` accepts an optional `planOnly` flag. When true, the agent emits the
  // plan proposal then `done` with zero tool calls.
  send: (prompt: string, options?: { planOnly?: boolean }) => void;
  stop: () => void;
  // Re-runs the most recent prompt with caller-approved steps. The agent
  // skips planning and executes the supplied steps in order.
  submitEditedPlan: (steps: PlanStep[]) => void;
  error?: { code: string; message: string; retryable: boolean };
  startedAt?: number;
  finishedAt?: number;
  statusState?: AgentStatusState;
  activeToolName?: string;
  placeholderHint: PlaceholderHint;
  // Node id the agent's most recent tool_call references, if any. Live while
  // a turn is running; clears on done / error / stop. Used by the canvas to
  // pulse a 1 px indigo ring on the node currently being touched.
  currentTargetNodeId: string | null;
  // The structured plan from the most recent `plan_proposal` event, or null
  // if no proposal has arrived this turn. PlanEditor reads this to render
  // the editable step list.
  currentPlan: PlanStep[] | null;
  // True when the in-flight turn was launched with planOnly=true. The UI
  // surfaces this to swap "Build" for "Plan first" affordances.
  planOnly: boolean;
};
