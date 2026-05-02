// Public surface for useAgentBuild, kept separate so consumers can import the
// types without pulling in the hook (and its React dependencies) at type time.

import type { AgentStatusState } from "@/lib/agent/types";

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
  send: (prompt: string) => void;
  stop: () => void;
  error?: { code: string; message: string; retryable: boolean };
  startedAt?: number;
  finishedAt?: number;
  statusState?: AgentStatusState;
  activeToolName?: string;
  placeholderHint: PlaceholderHint;
};
