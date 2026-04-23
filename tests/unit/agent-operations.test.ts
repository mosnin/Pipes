import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { AgentRunService } from "@/domain/services/agent_builder";
import { AgentOperationsService } from "@/domain/services/agent_operations";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

describe("agent operations and tuning", () => {
  it("supports pause resume cancel retry and fork control", async () => {
    const repos = createMockRepositories();
    const runService = new AgentRunService(repos);
    const ops = new AgentOperationsService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await runService.createSession(ctx as never, { systemId, title: "Ops" });
    const created = await runService.createRun(ctx as never, { sessionId: session.id, systemId, message: "start" });

    await ops.pauseRun(ctx as never, created.run.id, "operator check");
    expect((await repos.agentBuilder.getRun(created.run.id))?.status).toBe("blocked");
    await ops.resumeRun(ctx as never, created.run.id);
    expect((await repos.agentBuilder.getRun(created.run.id))?.status).toBe("running");
    const retried = await ops.retryRun(ctx as never, created.run.id);
    const forked = await ops.forkRun(ctx as never, created.run.id);
    expect(retried.id).not.toBe(created.run.id);
    expect(forked.run.id).not.toBe(created.run.id);
    await ops.cancelRun(ctx as never, created.run.id, "stop");
    expect((await repos.agentBuilder.getRun(created.run.id))?.status).toBe("canceled");
  });

  it("provides replay and comparison summaries", async () => {
    const repos = createMockRepositories();
    const runService = new AgentRunService(repos);
    const ops = new AgentOperationsService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await runService.createSession(ctx as never, { systemId, title: "Replay" });
    const r1 = await runService.createRun(ctx as never, { sessionId: session.id, systemId, message: "one" });
    const r2 = await runService.createRun(ctx as never, { sessionId: session.id, systemId, message: "two" });
    await runService.streamRun(ctx as never, { runId: r1.run.id, message: "one" });
    await runService.streamRun(ctx as never, { runId: r2.run.id, message: "two" });
    const replay = await ops.getReplay(ctx as never, r1.run.id);
    const comparison = await ops.compareRuns(ctx as never, r1.run.id, r2.run.id);
    expect(replay.summary.stageCount).toBeGreaterThan(0);
    expect(typeof comparison.leftScore).toBe("number");
  }, 15000);

  it("supports preset selection and experiment variant assignment", async () => {
    const repos = createMockRepositories();
    const runService = new AgentRunService(repos);
    const ops = new AgentOperationsService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await runService.createSession(ctx as never, { systemId, title: "Tuning" });
    const created = await runService.createRun(ctx as never, { sessionId: session.id, systemId, message: "test" });

    const active = await ops.setActivePreset(ctx as never, "cautious_review_preset");
    const presets = await ops.listBuilderPresets(ctx as never);
    const assignment = await ops.assignExperimentVariant(ctx as never, { runId: created.run.id, experimentId: "exp_1", variantId: "variant_a" });
    const outcome = await ops.summarizeExperimentOutcomes(ctx as never, "exp_1");

    expect(active.presetId).toBe("cautious_review_preset");
    expect(presets.length).toBeGreaterThan(0);
    expect(assignment.variantId).toBe("variant_a");
    expect(outcome[0]?.runCount).toBeGreaterThan(0);
  });
});
