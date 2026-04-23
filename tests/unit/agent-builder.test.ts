import { describe, expect, it } from "vitest";
import { AgentRunService, normalizeRunStatus, type RunExecutor } from "@/domain/services/agent_builder";
import { createMockRepositories } from "@/lib/repositories/mock";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

class SuccessExecutor implements RunExecutor {
  async execute(input: { onTextDelta: (delta: string) => Promise<void> }) {
    await input.onTextDelta("hello ");
    await input.onTextDelta("world");
  }
}

class ErrorExecutor implements RunExecutor {
  async execute() {
    throw new Error("provider exploded");
  }
}

describe("agent builder run model", () => {
  it("normalizes run status from events", () => {
    expect(normalizeRunStatus([{ type: "run_started", status: "running" }, { type: "run_completed", status: "completed" }])).toBe("completed");
  });

  it("creates session, run, and persists replayable events", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos, new SuccessExecutor());
    const session = await service.createSession(ctx as never, { systemId: "sys_1", title: "Session" });
    const created = await service.createRun(ctx as never, { sessionId: session.id, systemId: "sys_1", message: "help" });
    await service.streamRun(ctx as never, { runId: created.run.id, message: "help", systemName: "Demo" });
    const events = await service.listRunEvents(ctx as never, { runId: created.run.id });
    expect(events.length).toBeGreaterThan(3);
    expect(events.some((event) => event.type === "assistant_text_delta")).toBe(true);
    expect(events.some((event) => event.type === "run_completed")).toBe(true);
  });

  it("normalizes provider errors into run_failed events", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos, new ErrorExecutor());
    const session = await service.createSession(ctx as never, { title: "Err" });
    const created = await service.createRun(ctx as never, { sessionId: session.id, message: "boom" });
    await service.streamRun(ctx as never, { runId: created.run.id, message: "boom" });
    const events = await service.listRunEvents(ctx as never, { runId: created.run.id });
    expect(events.at(-1)?.type).toBe("run_failed");
  });
});
