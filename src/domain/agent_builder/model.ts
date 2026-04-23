import { z } from "zod";

export const RunStatusSchema = z.enum(["created", "running", "waiting", "completed", "failed", "canceled"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunEventTypeSchema = z.enum([
  "run_created",
  "run_started",
  "assistant_text_delta",
  "assistant_text_completed",
  "tool_call_started",
  "tool_call_completed",
  "tool_call_failed",
  "run_waiting",
  "run_completed",
  "run_failed",
  "run_canceled",
  "approval_required",
  "graph_action_proposed"
]);

export const ToolCallRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["started", "completed", "failed"]),
  summary: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional()
});

export const ApprovalRequestSchema = z.object({ id: z.string(), reason: z.string(), requiredBy: z.string().optional() });
export const GraphActionProposalSchema = z.object({ id: z.string(), summary: z.string(), actionType: z.string() });
export const RunTraceRefSchema = z.object({ traceId: z.string(), provider: z.string() });
export const RunCostSchema = z.object({ inputTokens: z.number().default(0), outputTokens: z.number().default(0), estimatedUsd: z.number().default(0) });

export const RunEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  type: RunEventTypeSchema,
  at: z.string(),
  sequence: z.number(),
  text: z.string().optional(),
  status: RunStatusSchema.optional(),
  toolCall: ToolCallRecordSchema.optional(),
  approvalRequest: ApprovalRequestSchema.optional(),
  graphActionProposal: GraphActionProposalSchema.optional(),
  traceRef: RunTraceRefSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const RunMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  runId: z.string().optional(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  body: z.string(),
  createdAt: z.string()
});

export const AgentSessionSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  title: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const AgentRunSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  status: RunStatusSchema,
  userMessageId: z.string(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  error: z.string().optional(),
  traceRef: RunTraceRefSchema.optional(),
  cost: RunCostSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type AgentSession = z.infer<typeof AgentSessionSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type RunEvent = z.infer<typeof RunEventSchema>;
export type RunMessage = z.infer<typeof RunMessageSchema>;
export type ToolCallRecord = z.infer<typeof ToolCallRecordSchema>;
