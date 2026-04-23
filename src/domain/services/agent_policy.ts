import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import { AgentPolicySchema, RunPolicySnapshotSchema, type AgentPolicy, type RunPolicySnapshot } from "@/domain/agent_builder/policy";

const now = () => new Date().toISOString();

export const DEFAULT_AGENT_POLICY: Omit<AgentPolicy, "id" | "workspaceId" | "createdAt" | "updatedAt"> = {
  scope: "workspace",
  systemId: undefined,
  tool: { allowedTools: ["get_system_summary", "get_validation_report", "propose_graph_actions"], forbiddenTools: [] },
  risk: { posture: "balanced", safeAutoApplyEnabled: true, maxProposalBatchSize: 5, maxAutoAppliedActionsPerRun: 3, requireCheckpointForStructural: true },
  approval: { strictness: "standard", requireApprovalForStructural: true, requireApprovalForDelete: true, requireApprovalForContractChanges: false, requireApprovalForBulkChanges: true, finalApproverRoles: ["Owner", "Admin"] },
  runtime: { allowedModelTier: "medium", maxRunDurationMs: 120000, maxProviderCallsPerRun: 20, maxConcurrentSubAgentTasks: 2, timeoutEscalationEnabled: true },
  cost: { maxRunTokenBudget: 18000, maxRunCostUsd: 2.5, behaviorOnBudgetExceeded: "pause_for_review" },
  concurrency: { maxConcurrentRunsPerWorkspace: 5, maxConcurrentSubAgentTasks: 2 },
  escalation: { onToolViolation: true, onBudgetExceeded: true, onTimeout: true, onRepeatedMalformedOutputs: true, onRepeatedValidationFailures: true, onNoEligibleApprover: true }
};

export class AgentPolicyService {
  constructor(private readonly repos: RepositorySet) {}
  isToolAllowed(snapshot: RunPolicySnapshot, toolName: string) {
    const allowlist = snapshot.tool.allowedTools;
    if (snapshot.tool.forbiddenTools.includes(toolName)) return false;
    if (allowlist.length > 0 && !allowlist.includes(toolName)) return false;
    return true;
  }

  async getPolicy(ctx: AppContext, input: { systemId?: string }) {
    const found = await this.repos.agentBuilder.getAgentPolicy({ workspaceId: ctx.workspaceId, systemId: input.systemId });
    if (found) return found;
    return this.repos.agentBuilder.upsertAgentPolicy(AgentPolicySchema.omit({ id: true, createdAt: true, updatedAt: true }).parse({ ...DEFAULT_AGENT_POLICY, workspaceId: ctx.workspaceId, systemId: input.systemId, scope: input.systemId ? "system_override" : "workspace" }));
  }

  async updatePolicy(ctx: AppContext, input: Omit<AgentPolicy, "id" | "workspaceId" | "createdAt" | "updatedAt"> & { systemId?: string }) {
    const updated = await this.repos.agentBuilder.upsertAgentPolicy({ ...input, workspaceId: ctx.workspaceId, updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "agent_policy_updated", targetType: "agent_policy", targetId: updated.id, outcome: "success" });
    return updated;
  }

  async resolveRunPolicySnapshot(ctx: AppContext, input: { runId: string; systemId?: string }): Promise<RunPolicySnapshot> {
    const policy = await this.getPolicy(ctx, { systemId: input.systemId });
    const existing = await this.repos.agentBuilder.getRunPolicySnapshot({ runId: input.runId });
    if (existing) return existing;
    const snapshot = await this.repos.agentBuilder.addRunPolicySnapshot(RunPolicySnapshotSchema.omit({ id: true }).parse({ ...policy, runId: input.runId, policyId: policy.id, resolvedFromScope: policy.scope, createdAt: now() }));
    await this.repos.agentBuilder.addPolicyDecisionRecord({ runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId, policySnapshotId: snapshot.id, decisionType: "approval_required", subject: "run_policy_snapshot", explanation: `Risk posture=${snapshot.risk.posture}; autoApply=${snapshot.risk.safeAutoApplyEnabled}`, createdAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "run_policy_snapshot_created", targetType: "run_policy_snapshot", targetId: snapshot.id, outcome: "success" });
    return snapshot;
  }

  async recordRuntimeUsage(ctx: AppContext, input: { runId: string; providerCalls?: number; estimatedTokens?: number; estimatedCostUsd?: number; elapsedMs?: number; autoAppliedActions?: number }) {
    const prior = await this.repos.agentBuilder.getRuntimeUsageRecord({ runId: input.runId });
    return this.repos.agentBuilder.upsertRuntimeUsageRecord({ runId: input.runId, workspaceId: ctx.workspaceId, providerCalls: input.providerCalls ?? prior?.providerCalls ?? 0, estimatedTokens: input.estimatedTokens ?? prior?.estimatedTokens ?? 0, estimatedCostUsd: input.estimatedCostUsd ?? prior?.estimatedCostUsd ?? 0, elapsedMs: input.elapsedMs ?? prior?.elapsedMs ?? 0, autoAppliedActions: input.autoAppliedActions ?? prior?.autoAppliedActions ?? 0, updatedAt: now() });
  }
}
