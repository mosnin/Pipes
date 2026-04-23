import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { RuntimeRoutingService } from "@/domain/services/runtime_routing";
import { AgentRuntimeService } from "@/domain/services/agent_runtime";
import { OpenAIAgentHarnessService } from "@/lib/ai/openai_agents_harness";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

const basePolicy = {
  id: "pol_1",
  runId: "run_1",
  workspaceId: "wks_1",
  systemId: "sys_1",
  policyId: "policy",
  resolvedFromScope: "workspace",
  tool: { allowedTools: ["get_validation_report", "sandbox_exec"], forbiddenTools: [] },
  risk: { posture: "balanced", safeAutoApplyEnabled: true, maxProposalBatchSize: 5, maxAutoAppliedActionsPerRun: 3, requireCheckpointForStructural: true },
  approval: { strictness: "standard", requireApprovalForStructural: true, requireApprovalForDelete: true, requireApprovalForContractChanges: true, requireApprovalForBulkChanges: true, finalApproverRoles: ["Owner"] },
  runtime: { allowedModelTier: "small", maxRunDurationMs: 120000, maxProviderCallsPerRun: 20, maxConcurrentSubAgentTasks: 4, timeoutEscalationEnabled: true },
  cost: { maxRunTokenBudget: 20000, maxRunCostUsd: 5, behaviorOnBudgetExceeded: "pause_for_review" },
  concurrency: { maxConcurrentRunsPerWorkspace: 4, maxConcurrentSubAgentTasks: 4 },
  escalation: { onToolViolation: true, onBudgetExceeded: true, onTimeout: true, onRepeatedMalformedOutputs: true, onRepeatedValidationFailures: true, onNoEligibleApprover: true },
  createdAt: new Date().toISOString()
} as const;

describe("runtime stack", () => {
  it("resolves routing target with policy-aware rules", () => {
    const repos = createMockRepositories();
    const routing = new RuntimeRoutingService(repos);
    const decision = routing.resolve(ctx as never, {
      task: {
        id: "task_1",
        runId: "run_1",
        workspaceId: "wks_1",
        skillId: "synthesize_artifact_manifest",
        role: "subsystem_builder_sub_agent",
        contextPack: { subsystemId: "sub_1", subsystemSummary: "sub", selectedNodeIds: ["1", "2", "3", "4", "5", "6", "7"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "goal", relevantValidationIssues: ["a", "b", "c", "d"], stage: "design_structure", recentRunNotes: [] }
      },
      policy: basePolicy as never
    });
    expect(decision.target).toBe("modal_sandbox");
  });

  it("blocks sandbox-required tasks when policy disallows sandbox", async () => {
    const repos = createMockRepositories();
    const runtime = new AgentRuntimeService(repos);
    await expect(runtime.executeSubAgent(ctx as never, {
      task: { id: "task_2", runId: "run_1", workspaceId: "wks_1", role: "subsystem_builder_sub_agent", skillId: "artifact_packaging", contextPack: { subsystemId: "sub_1", subsystemSummary: "sub", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "goal", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] } },
      request: { role: "subsystem_builder_sub_agent", skillId: "artifact_packaging", contextPack: { subsystemId: "sub_1", subsystemSummary: "sub", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "goal", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] }, userMessage: "build" },
      policy: { ...basePolicy, tool: { allowedTools: ["get_validation_report"], forbiddenTools: ["sandbox_exec"] } } as never
    })).rejects.toThrow("sandbox_required_but_blocked_by_policy");
  });

  it("normalizes harness outputs into pipes-native payload", async () => {
    const harness = new OpenAIAgentHarnessService();
    const result = await harness.execute({ role: "architect_sub_agent", skillId: "design_subsystem_structure", contextPack: { subsystemId: "sub_1", subsystemSummary: "sub", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "goal", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] }, userMessage: "design" });
    expect(Array.isArray(result.output.proposalInputs)).toBe(true);
  });

  it("records runtime lifecycle for routed execution", async () => {
    const repos = createMockRepositories();
    const runtime = new AgentRuntimeService(repos);
    const out = await runtime.executeSubAgent(ctx as never, {
      task: { id: "task_3", runId: "run_3", workspaceId: "wks_1", role: "architect_sub_agent", skillId: "design_subsystem_structure", contextPack: { subsystemId: "sub_1", subsystemSummary: "sub", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "goal", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] } },
      request: { role: "architect_sub_agent", skillId: "design_subsystem_structure", contextPack: { subsystemId: "sub_1", subsystemSummary: "sub", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "goal", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] }, userMessage: "design" },
      policy: basePolicy as never
    });
    const records = await runtime.listTaskExecution(ctx as never, "run_3");
    expect(records.length).toBeGreaterThan(0);
    expect(["inline_host", "modal_worker", "modal_sandbox"]).toContain(out.metadata.target);
  });
});
