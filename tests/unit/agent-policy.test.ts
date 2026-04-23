import { describe, expect, it } from "vitest";
import { AgentPolicySchema } from "@/domain/agent_builder/policy";
import { AgentPolicyService } from "@/domain/services/agent_policy";
import { AgentRunService } from "@/domain/services/agent_builder";
import { createMockRepositories } from "@/lib/repositories/mock";

const ownerCtx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

describe("agent policy and controls", () => {
  it("validates policy schema and resolves snapshot", async () => {
    const repos = createMockRepositories();
    const service = new AgentPolicyService(repos);
    const policy = await service.getPolicy(ownerCtx as never, {});
    expect(() => AgentPolicySchema.parse(policy)).not.toThrow();
    const snapshot = await service.resolveRunPolicySnapshot(ownerCtx as never, { runId: "run_x", systemId: "sys_1" });
    expect(snapshot.runId).toBe("run_x");
  });

  it("enforces conservative policy by blocking auto-apply path", async () => {
    const repos = createMockRepositories();
    const policyService = new AgentPolicyService(repos);
    await policyService.updatePolicy(ownerCtx as never, {
      scope: "workspace",
      systemId: undefined,
      tool: { allowedTools: ["get_system_summary", "get_validation_report", "propose_graph_actions"], forbiddenTools: [] },
      risk: { posture: "conservative", safeAutoApplyEnabled: false, maxProposalBatchSize: 2, maxAutoAppliedActionsPerRun: 0, requireCheckpointForStructural: true },
      approval: { strictness: "strict", requireApprovalForStructural: true, requireApprovalForDelete: true, requireApprovalForContractChanges: true, requireApprovalForBulkChanges: true, finalApproverRoles: ["Owner", "Admin"] },
      runtime: { allowedModelTier: "medium", maxRunDurationMs: 120000, maxProviderCallsPerRun: 10, maxConcurrentSubAgentTasks: 1, timeoutEscalationEnabled: true },
      cost: { maxRunTokenBudget: 10000, maxRunCostUsd: 1, behaviorOnBudgetExceeded: "pause_for_review" },
      concurrency: { maxConcurrentRunsPerWorkspace: 2, maxConcurrentSubAgentTasks: 1 },
      escalation: { onToolViolation: true, onBudgetExceeded: true, onTimeout: true, onRepeatedMalformedOutputs: true, onRepeatedValidationFailures: true, onNoEligibleApprover: true }
    });
    const runService = new AgentRunService(repos);
    const systemId = (await repos.systems.list(ownerCtx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await runService.createSession(ownerCtx as never, { systemId, title: "policy run" });
    const created = await runService.createRun(ownerCtx as never, { sessionId: session.id, systemId, message: "add safe annotation" });
    await runService.streamRun(ownerCtx as never, { runId: created.run.id, message: "add safe annotation", systemName: "Demo" });
    const decisions = await repos.agentBuilder.listPolicyDecisionRecords({ runId: created.run.id });
    expect(decisions.some((d) => d.decisionType === "auto_apply_blocked")).toBe(true);
  }, 20000);

  it("enforces tool allow/deny resolution deterministically", async () => {
    const repos = createMockRepositories();
    const policyService = new AgentPolicyService(repos);
    const policy = await policyService.updatePolicy(ownerCtx as never, {
      scope: "workspace",
      systemId: undefined,
      tool: { allowedTools: ["get_system_summary", "get_validation_report", "propose_graph_actions"], forbiddenTools: ["get_validation_report"] },
      risk: { posture: "balanced", safeAutoApplyEnabled: true, maxProposalBatchSize: 5, maxAutoAppliedActionsPerRun: 3, requireCheckpointForStructural: true },
      approval: { strictness: "standard", requireApprovalForStructural: true, requireApprovalForDelete: true, requireApprovalForContractChanges: false, requireApprovalForBulkChanges: true, finalApproverRoles: ["Owner", "Admin"] },
      runtime: { allowedModelTier: "medium", maxRunDurationMs: 120000, maxProviderCallsPerRun: 5, maxConcurrentSubAgentTasks: 2, timeoutEscalationEnabled: true },
      cost: { maxRunTokenBudget: 10000, maxRunCostUsd: 1, behaviorOnBudgetExceeded: "pause_for_review" },
      concurrency: { maxConcurrentRunsPerWorkspace: 2, maxConcurrentSubAgentTasks: 2 },
      escalation: { onToolViolation: true, onBudgetExceeded: true, onTimeout: true, onRepeatedMalformedOutputs: true, onRepeatedValidationFailures: true, onNoEligibleApprover: true }
    });
    const snapshot = await policyService.resolveRunPolicySnapshot(ownerCtx as never, { runId: "run_tools", systemId: undefined });
    expect(policy.id).toBeTruthy();
    expect(policyService.isToolAllowed(snapshot, "get_system_summary")).toBe(true);
    expect(policyService.isToolAllowed(snapshot, "get_validation_report")).toBe(false);
    expect(policyService.isToolAllowed(snapshot, "unknown_tool")).toBe(false);
  });
});
