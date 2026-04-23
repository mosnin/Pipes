import { z } from "zod";

export const PolicyScopeSchema = z.enum(["workspace", "system_override", "run_snapshot"]);
export const RiskPostureSchema = z.enum(["conservative", "balanced", "aggressive"]);
export const ApprovalStrictnessSchema = z.enum(["strict", "standard", "relaxed"]);

export const ToolPolicySchema = z.object({ allowedTools: z.array(z.string()).default([]), forbiddenTools: z.array(z.string()).default([]) });
export const RiskPolicySchema = z.object({ posture: RiskPostureSchema, safeAutoApplyEnabled: z.boolean(), maxProposalBatchSize: z.number().int().min(1), maxAutoAppliedActionsPerRun: z.number().int().min(0), requireCheckpointForStructural: z.boolean() });
export const ApprovalPolicySchema = z.object({ strictness: ApprovalStrictnessSchema, requireApprovalForStructural: z.boolean(), requireApprovalForDelete: z.boolean(), requireApprovalForContractChanges: z.boolean(), requireApprovalForBulkChanges: z.boolean(), finalApproverRoles: z.array(z.string()).default(["Owner", "Admin"]) });
export const RuntimePolicySchema = z.object({ allowedModelTier: z.enum(["small", "medium", "large"]), maxRunDurationMs: z.number().int().min(1000), maxProviderCallsPerRun: z.number().int().min(1), maxConcurrentSubAgentTasks: z.number().int().min(1), timeoutEscalationEnabled: z.boolean() });
export const CostPolicySchema = z.object({ maxRunTokenBudget: z.number().int().min(1), maxRunCostUsd: z.number().min(0), behaviorOnBudgetExceeded: z.enum(["pause_for_review", "stop_and_escalate"]) });
export const EscalationPolicySchema = z.object({ onToolViolation: z.boolean(), onBudgetExceeded: z.boolean(), onTimeout: z.boolean(), onRepeatedMalformedOutputs: z.boolean(), onRepeatedValidationFailures: z.boolean(), onNoEligibleApprover: z.boolean() });
export const ConcurrencyPolicySchema = z.object({ maxConcurrentRunsPerWorkspace: z.number().int().min(1), maxConcurrentSubAgentTasks: z.number().int().min(1) });

export const AgentPolicySchema = z.object({
  id: z.string(), workspaceId: z.string(), systemId: z.string().optional(), scope: PolicyScopeSchema,
  tool: ToolPolicySchema, risk: RiskPolicySchema, approval: ApprovalPolicySchema, runtime: RuntimePolicySchema, cost: CostPolicySchema, concurrency: ConcurrencyPolicySchema, escalation: EscalationPolicySchema,
  createdAt: z.string(), updatedAt: z.string()
});

export const RunPolicySnapshotSchema = z.object({
  id: z.string(), runId: z.string(), workspaceId: z.string(), systemId: z.string().optional(), policyId: z.string(), resolvedFromScope: PolicyScopeSchema,
  tool: ToolPolicySchema, risk: RiskPolicySchema, approval: ApprovalPolicySchema, runtime: RuntimePolicySchema, cost: CostPolicySchema, concurrency: ConcurrencyPolicySchema, escalation: EscalationPolicySchema,
  createdAt: z.string()
});

export const PolicyDecisionRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), systemId: z.string().optional(), policySnapshotId: z.string(), decisionType: z.enum(["tool_allowed", "tool_blocked", "auto_apply_allowed", "auto_apply_blocked", "approval_required", "budget_limit_hit", "timeout_limit_hit", "escalated"]), subject: z.string(), explanation: z.string(), createdAt: z.string() });
export const RuntimeUsageRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), providerCalls: z.number().int(), estimatedTokens: z.number().int(), estimatedCostUsd: z.number(), elapsedMs: z.number().int(), autoAppliedActions: z.number().int(), createdAt: z.string(), updatedAt: z.string() });
export const EscalationRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), systemId: z.string().optional(), reason: z.string(), suggestedAction: z.string(), severity: z.enum(["warning", "blocking"]), createdAt: z.string() });

export type AgentPolicy = z.infer<typeof AgentPolicySchema>;
export type RunPolicySnapshot = z.infer<typeof RunPolicySnapshotSchema>;
export type PolicyDecisionRecord = z.infer<typeof PolicyDecisionRecordSchema>;
export type RuntimeUsageRecord = z.infer<typeof RuntimeUsageRecordSchema>;
export type EscalationRecord = z.infer<typeof EscalationRecordSchema>;
