import { describe, expect, it } from "vitest";
import { GraphActionPayloadSchema, classifyRisk, riskToApplyMode } from "@/domain/agent_builder/actions";
import { createMockRepositories } from "@/lib/repositories/mock";
import { AgentRunService } from "@/domain/services/agent_builder";
import { AgentToolService, ToolNameSchema } from "@/domain/services/agent_tools";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

describe("agent graph action protocol", () => {
  it("validates typed payload schema", () => {
    const action = GraphActionPayloadSchema.parse({ actionType: "add_node", nodeType: "Processor", title: "A", position: { x: 10, y: 20 } });
    expect(action.actionType).toBe("add_node");
  });

  it("validates supported tool contracts", () => {
    expect(ToolNameSchema.parse("get_system_summary")).toBe("get_system_summary");
  });

  it("classifies risk and apply mode", () => {
    const safe = classifyRisk({ actionType: "move_node", nodeId: "n1", position: { x: 1, y: 2 } });
    const risky = classifyRisk({ actionType: "delete_node", nodeId: "n1" });
    expect(riskToApplyMode(safe)).toBe("auto_apply");
    expect(riskToApplyMode(risky)).toBe("hold_for_review");
  });

  it("approval lifecycle pauses and resumes run", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing seeded system");
    const session = await service.createSession(ctx as never, { systemId, title: "Review" });
    const run = (await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "Delete risky thing" })).run;
    await service.streamRun(ctx as never, { runId: run.id, message: "Delete risky thing", systemName: "Demo" });
    const approvals = await service.listApprovals(ctx as never, { runId: run.id, status: "pending" });
    expect(approvals.length).toBeGreaterThan(0);
    const resume = await service.reviewApproval(ctx as never, { requestId: approvals[0].id, decision: "approved" });
    expect(resume.resumed).toBe(true);
  });

  it("tool outputs normalize through bounded service", async () => {
    const repos = createMockRepositories();
    const tools = new AgentToolService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing seeded system");
    const result = await tools.runTool(ctx as never, systemId, "get_system_summary", {});
    expect((result as any).nodeCount).toBeTypeOf("number");
  });
});
