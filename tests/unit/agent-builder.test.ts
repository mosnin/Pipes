import { describe, expect, it } from "vitest";
import { AgentRunService, normalizeRunStatus } from "@/domain/services/agent_builder";
import { createMockRepositories } from "@/lib/repositories/mock";
import type { SubAgentExecutor } from "@/lib/runtime/sub_agent_executor";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

describe("agent builder run model", () => {
  it("normalizes run status from events", () => {
    expect(normalizeRunStatus([{ type: "run_started", status: "planning" }, { type: "run_completed", status: "completed" }])).toBe("completed");
  });

  it("creates plan and tool history before proposing actions", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing seeded system");
    const session = await service.createSession(ctx as never, { systemId, title: "Session" });
    const created = await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "help" });
    await service.streamRun(ctx as never, { runId: created.run.id, message: "help", systemName: "Demo" });
    const plan = await service.getPlan(ctx as never, created.run.id);
    const tools = await service.listToolCalls(ctx as never, created.run.id);
    const stages = await service.listStageRecords(ctx as never, created.run.id);
    const roles = await service.listRoleActivities(ctx as never, created.run.id);
    const revisions = await service.listPlanRevisions(ctx as never, created.run.id);
    const batches = await service.listProposalBatches(ctx as never, created.run.id);
    const subTasks = await service.listSubAgentTasks(ctx as never, created.run.id);
    const subResults = await service.listSubAgentResults(ctx as never, created.run.id);
    const skills = await service.listSkillInvocations(ctx as never, created.run.id);
    const orchestration = await service.listOrchestrationSteps(ctx as never, created.run.id);
    const reconciliation = await service.listReconciliationRecords(ctx as never, created.run.id);
    const evaluations = await service.listEvaluations(ctx as never, { runId: created.run.id, systemId });
    const strategyPerf = await service.listStrategyPerformance(ctx as never, { runId: created.run.id, systemId });
    const skillPerf = await service.listSkillPerformance(ctx as never, { runId: created.run.id, systemId });
    const learning = await service.listLearningArtifacts(ctx as never, { runId: created.run.id, systemId });
    expect(plan?.summary).toContain("Inspect system state");
    expect(tools.length).toBeGreaterThan(0);
    expect(stages.some((s) => s.stage === "intake")).toBe(true);
    expect(roles.some((r) => r.role === "architect")).toBe(true);
    expect(revisions.length).toBeGreaterThan(0);
    expect(batches.length).toBeGreaterThan(0);
    expect(subTasks.length).toBeGreaterThanOrEqual(2);
    expect(subTasks.every((task) => task.contextPack.selectedNodeIds.length > 0)).toBe(true);
    expect(subResults.length).toBeGreaterThan(0);
    expect(skills.length).toBeGreaterThan(0);
    expect(orchestration.some((step) => step.decision === "decompose")).toBe(true);
    expect(reconciliation.length).toBeGreaterThan(0);
    expect(evaluations.some((row) => row.scope === "run")).toBe(true);
    expect(strategyPerf.length).toBeGreaterThan(0);
    expect(skillPerf.length).toBeGreaterThan(0);
    expect(learning.length).toBeGreaterThan(0);
  }, 15000);

  it("marks reconciliation as review required when conflict signals exist", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing seeded system");
    const session = await service.createSession(ctx as never, { systemId, title: "Conflict Session" });
    const created = await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "Please clean up by deleting unstable nodes and tighten reliability." });
    await service.streamRun(ctx as never, { runId: created.run.id, message: "Please clean up by deleting unstable nodes and tighten reliability.", systemName: "Demo" });
    const reconciliation = await service.listReconciliationRecords(ctx as never, created.run.id);
    expect(reconciliation.some((record) => record.decision === "review_required")).toBe(true);
  }, 15000);

  it("handles malformed provider output by failing task safely", async () => {
    const repos = createMockRepositories();
    const badExecutor: SubAgentExecutor = {
      async execute() {
        throw new Error("malformed_provider_output");
      }
    };
    const service = new AgentRunService(repos, undefined, badExecutor);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing seeded system");
    const session = await service.createSession(ctx as never, { systemId, title: "Bad Provider Session" });
    const created = await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "design safely" });
    await service.streamRun(ctx as never, { runId: created.run.id, message: "design safely", systemName: "Demo" });
    const tasks = await service.listSubAgentTasks(ctx as never, created.run.id);
    expect(tasks.some((task) => task.status === "failed")).toBe(true);
  }, 15000);

  it("reuses promoted patterns and lifecycle records are inspectable", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing seeded system");
    await repos.agentMemory.addPatternArtifact({
      workspaceId: ctx.workspaceId,
      systemId,
      runId: undefined,
      scope: "system",
      title: "Reliable fan-out",
      summary: "Use annotation guardrails and review boundary.",
      intendedUse: "Reliability shaping",
      inputContractSummary: "bounded",
      outputContractSummary: "stable",
      riskNotes: "review risky deletes",
      tags: ["reliability"],
      provenance: { createdBy: ctx.userId },
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const session = await service.createSession(ctx as never, { systemId, title: "Lifecycle Session" });
    const created = await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "Apply reliability pattern and avoid risky churn." });
    await service.streamRun(ctx as never, { runId: created.run.id, message: "Apply reliability pattern and avoid risky churn.", systemName: "Demo" });
    const lifecycle = await service.listPatternLifecycle(ctx as never, { systemId });
    expect(lifecycle.promoted.length + lifecycle.demoted.length).toBeGreaterThan(0);
  }, 15000);
});
