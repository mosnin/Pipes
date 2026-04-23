import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { SandboxSessionService } from "@/domain/services/sandbox_session";
import { SandboxArtifactService } from "@/domain/services/sandbox_artifact";
import { AgentRuntimeService } from "@/domain/services/agent_runtime";
import { HandoffGenerationService } from "@/domain/services/handoff_generation";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

const policy = {
  id: "pol_1", runId: "run_1", workspaceId: "wks_1", systemId: "sys_1", policyId: "p", resolvedFromScope: "workspace",
  tool: { allowedTools: ["get_validation_report", "sandbox_exec"], forbiddenTools: [] },
  risk: { posture: "balanced", safeAutoApplyEnabled: true, maxProposalBatchSize: 5, maxAutoAppliedActionsPerRun: 3, requireCheckpointForStructural: true },
  approval: { strictness: "standard", requireApprovalForStructural: true, requireApprovalForDelete: true, requireApprovalForContractChanges: true, requireApprovalForBulkChanges: true, finalApproverRoles: ["Owner"] },
  runtime: { allowedModelTier: "small", maxRunDurationMs: 120000, maxProviderCallsPerRun: 20, maxConcurrentSubAgentTasks: 4, timeoutEscalationEnabled: true },
  cost: { maxRunTokenBudget: 20000, maxRunCostUsd: 5, behaviorOnBudgetExceeded: "pause_for_review" },
  concurrency: { maxConcurrentRunsPerWorkspace: 4, maxConcurrentSubAgentTasks: 4 },
  escalation: { onToolViolation: true, onBudgetExceeded: true, onTimeout: true, onRepeatedMalformedOutputs: true, onRepeatedValidationFailures: true, onNoEligibleApprover: true },
  createdAt: new Date().toISOString()
} as const;

describe("sandbox artifacts and sessions", () => {
  it("handles sandbox session lifecycle and resumability", async () => {
    const repos = createMockRepositories();
    const svc = new SandboxSessionService(repos);
    const session = await svc.createSession(ctx as never, { runId: "run_1", taskId: "task_1", executionTarget: "modal_sandbox" });
    const resumed = await svc.createSession(ctx as never, { runId: "run_1", taskId: "task_1", executionTarget: "modal_sandbox", resumeFromSessionId: session.id });
    const active = await svc.updateStatus(ctx as never, { sessionId: resumed.id, status: "active" });
    expect(active.status).toBe("active");
    expect((await svc.listSessions(ctx as never, "run_1")).length).toBeGreaterThan(1);
  });

  it("creates bounded file bundles and workspace mount refs", async () => {
    const repos = createMockRepositories();
    const svc = new SandboxSessionService(repos);
    const bundle = await svc.prepareInputBundle(ctx as never, { runId: "run_2", taskId: "task_2", bundleType: "handoff_context", content: "hello" });
    const mount = await svc.requestWorkspaceMount(ctx as never, { mountType: "schema_summary", pathHint: "/workspace/wks_1/summary" });
    expect(bundle.fileCount).toBe(1);
    expect(mount.mountType).toBe("schema_summary");
  });

  it("normalizes artifacts and exposes preview", async () => {
    const repos = createMockRepositories();
    const svc = new SandboxArtifactService(repos);
    const artifact = await svc.createFromRaw(ctx as never, { runId: "run_3", taskId: "task_3", sessionId: "session_3", type: "markdown_bundle", title: "draft", rawContent: "# hello" });
    const normalized = await svc.normalize(ctx as never, artifact.id, (raw) => raw.toUpperCase());
    const preview = await svc.getPreview(ctx as never, artifact.id);
    expect(normalized.artifact.normalized).toBe(true);
    expect(preview.content).toContain("HELLO");
  });

  it("blocks sandbox-required task by policy", async () => {
    const repos = createMockRepositories();
    const runtime = new AgentRuntimeService(repos);
    await expect(runtime.executeSubAgent(ctx as never, {
      task: { id: "task_4", runId: "run_4", workspaceId: "wks_1", role: "subsystem_builder_sub_agent", skillId: "artifact_packaging", contextPack: { subsystemId: "s", subsystemSummary: "s", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "g", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] } },
      request: { role: "subsystem_builder_sub_agent", skillId: "artifact_packaging", contextPack: { subsystemId: "s", subsystemSummary: "s", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "g", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] }, userMessage: "build" },
      policy: { ...policy, tool: { allowedTools: ["get_validation_report"], forbiddenTools: ["sandbox_exec"] } } as never
    })).rejects.toThrow("sandbox_required_but_blocked_by_policy");
  });

  it("integration: runtime modal sandbox path generates browsable artifact", async () => {
    const repos = createMockRepositories();
    const runtime = new AgentRuntimeService(repos);
    await runtime.executeSubAgent(ctx as never, {
      task: { id: "task_5", runId: "run_5", workspaceId: "wks_1", role: "subsystem_builder_sub_agent", skillId: "artifact_packaging", contextPack: { subsystemId: "s", subsystemSummary: "s", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "g", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] } },
      request: { role: "subsystem_builder_sub_agent", skillId: "artifact_packaging", contextPack: { subsystemId: "s", subsystemSummary: "s", selectedNodeIds: ["1"], localContracts: [], adjacentSubsystemSummaries: [], systemGoalSummary: "g", relevantValidationIssues: [], stage: "design_structure", recentRunNotes: [] }, userMessage: "build" },
      policy: policy as never
    });
    const artifacts = await runtime.listSandboxArtifacts(ctx as never, "run_5");
    expect(artifacts.length).toBeGreaterThan(0);
  });

  it("integration: handoff generation can assemble sandbox-backed artifact", async () => {
    const repos = createMockRepositories();
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("system missing");
    const handoff = new HandoffGenerationService(repos);
    await handoff.generate(ctx as never, { systemId, target: "codex", sourceRunId: "run_h1" });
    const artifacts = await new SandboxArtifactService(repos).listByRun(ctx as never, "run_h1");
    expect(artifacts.some((a) => a.type === "handoff_bundle")).toBe(true);
  });
});
