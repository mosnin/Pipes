import { describe, expect, it } from "vitest";
import { AgentRunService, normalizeRunStatus } from "@/domain/services/agent_builder";
import { createMockRepositories } from "@/lib/repositories/mock";

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
    expect(plan?.summary).toContain("Inspect system state");
    expect(tools.length).toBeGreaterThan(0);
  });
});
