import { describe, expect, it } from "vitest";
import { MemoryEntrySchema } from "@/domain/agent_builder/memory";
import { createMockRepositories } from "@/lib/repositories/mock";
import { AgentMemoryService, BuilderStrategyService, MemoryRetrievalService, PatternArtifactService } from "@/domain/services/agent_memory";
import { AgentRunService } from "@/domain/services/agent_builder";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

describe("agent memory and continuity", () => {
  it("validates typed memory schema", () => {
    const entry = MemoryEntrySchema.parse({
      id: "m1", workspaceId: "wks_1", systemId: "sys_1", scope: "system", type: "plan_memory", source: "run_artifact", confidence: "medium", status: "active", title: "Summary", summary: "Keep guardrails", tags: ["guardrail"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    expect(entry.type).toBe("plan_memory");
  });

  it("retrieves relevant memory entries and ignores stale", async () => {
    const repos = createMockRepositories();
    const retrieval = new MemoryRetrievalService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]!.id;
    await repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId, scope: "system", type: "architecture_preference", source: "user_saved", confidence: "high", status: "active", title: "Use resilient fanout", summary: "fanout pattern", tags: ["fanout"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId, scope: "system", type: "plan_memory", source: "run_artifact", confidence: "low", status: "active", title: "Old note", summary: "obsolete", tags: ["old"], staleAfter: "2020-01-01T00:00:00.000Z", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const result = await retrieval.retrieveForRun(ctx as never, { systemId, runId: "run_1", message: "fanout reliability" });
    expect(result.memoryEntries.some((entry) => entry.title.includes("fanout"))).toBe(true);
    const stale = await repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, systemId, type: "plan_memory" });
    expect(stale.some((entry) => entry.status === "stale")).toBe(true);
  });

  it("selects and persists strategy preference", async () => {
    const repos = createMockRepositories();
    const strategies = new BuilderStrategyService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]!.id;
    const first = await strategies.selectActiveStrategy(ctx as never, { systemId, runMessage: "validate thoroughly" });
    expect(first.name).toBe("validation_heavy");
    await strategies.setPreferredStrategy(ctx as never, { systemId, name: "cautious_review" });
    const second = await strategies.selectActiveStrategy(ctx as never, { systemId, runMessage: "anything" });
    expect(second.name).toBe("validation_heavy");
  });

  it("saves and reuses subsystem pattern artifacts", async () => {
    const repos = createMockRepositories();
    const patterns = new PatternArtifactService(repos);
    const retrieval = new MemoryRetrievalService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]!.id;
    await patterns.savePatternFromRun(ctx as never, {
      systemId,
      title: "Queue retry subsystem",
      summary: "Reusable retry subsystem",
      intendedUse: "reliable processing",
      inputContractSummary: "jobs in",
      outputContractSummary: "processed jobs",
      riskNotes: "watch dead letters",
      tags: ["retry", "queue"],
      subsystemId: "subsystem_safety"
    });
    const result = await retrieval.retrieveForRun(ctx as never, { systemId, runId: "run_2", message: "Need retry queue" });
    expect(result.patternArtifacts.some((pattern) => pattern.title.includes("Queue"))).toBe(true);
  });

  it("integration: later run reuses memory and strategy context", async () => {
    const repos = createMockRepositories();
    const runService = new AgentRunService(repos);
    const memory = new AgentMemoryService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]!.id;
    await repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId, scope: "system", type: "review_preference", source: "user_saved", confidence: "high", status: "active", title: "Require review on deletes", summary: "always review deletes", tags: ["review"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await memory.setPreferredStrategy(ctx as never, { systemId, name: "cautious_review" });

    const session = await runService.createSession(ctx as never, { systemId, title: "Continuity Session" });
    const run = (await runService.createRun(ctx as never, { sessionId: session.id, systemId, message: "Improve reliability with delete checks" })).run;
    await runService.streamRun(ctx as never, { runId: run.id, message: "Improve reliability with delete checks", systemName: "Demo" });

    const memories = await runService.listMemoryEntries(ctx as never, { systemId });
    const continuations = await repos.agentMemory.listSessionContinuationRefs({ workspaceId: ctx.workspaceId, systemId });
    expect(memories.length).toBeGreaterThan(0);
    expect(continuations.length).toBeGreaterThan(0);
  }, 20000);
});
