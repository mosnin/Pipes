import { z } from "zod";
import { GraphActionProposalSchema } from "@/domain/agent_builder/actions";

export const RunStatusSchema = z.enum(["created", "planning", "tooling", "waiting_for_approval", "applying", "blocked", "running", "completed", "failed", "canceled"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const PlanStatusSchema = z.enum(["created", "updated", "ready", "requires_approval", "completed", "blocked"]);
export const RunPlanSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  summary: z.string(),
  status: PlanStatusSchema,
  confidence: z.number().min(0).max(1),
  requiresApproval: z.boolean(),
  steps: z.array(z.object({ id: z.string(), title: z.string(), toolNames: z.array(z.string()).default([]), expectedActionTypes: z.array(z.string()).default([]) })),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ToolCallRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  toolName: z.string(),
  inputJson: z.string(),
  outputJson: z.string().optional(),
  status: z.enum(["started", "completed", "failed"]),
  error: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional()
});

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  runId: z.string(),
  proposalId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  targetType: z.enum(["plan", "action_batch", "graph_action"]),
  targetRef: z.string(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  decisionNote: z.string().optional(),
  requestedAt: z.string(),
  decidedAt: z.string().optional(),
  decidedBy: z.string().optional()
});

export const RunEventTypeSchema = z.enum([
  "run_created",
  "run_started",
  "plan_created",
  "plan_updated",
  "tool_call_started",
  "tool_call_completed",
  "tool_call_failed",
  "approval_requested",
  "approval_approved",
  "approval_rejected",
  "assistant_text_delta",
  "assistant_text_completed",
  "graph_action_proposed",
  "graph_action_auto_applied",
  "graph_action_review_required",
  "graph_action_approved",
  "graph_action_rejected",
  "graph_action_apply_failed",
  "graph_version_checkpoint_created",
  "run_waiting",
  "run_completed",
  "run_failed",
  "run_canceled"
]);

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
  graphActionProposal: GraphActionProposalSchema.partial().optional(),
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
  createdAt: z.string(),
  updatedAt: z.string()
});

export type AgentSession = z.infer<typeof AgentSessionSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type RunEvent = z.infer<typeof RunEventSchema>;
export type RunMessage = z.infer<typeof RunMessageSchema>;
export type RunPlan = z.infer<typeof RunPlanSchema>;
export type ToolCallRecord = z.infer<typeof ToolCallRecordSchema>;
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
