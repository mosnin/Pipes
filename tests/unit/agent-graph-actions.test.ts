import { describe, expect, it } from "vitest";
import { GraphActionPayloadSchema, classifyRisk, riskToApplyMode } from "@/domain/agent_builder/actions";
import { createMockRepositories } from "@/lib/repositories/mock";
import { AgentRunService } from "@/domain/services/agent_builder";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };
describe("agent graph action protocol", () => {
  it("validates typed payload schema", () => {
    const action = GraphActionPayloadSchema.parse({ actionType: "add_node", nodeType: "Processor", title: "A", position: { x: 10, y: 20 } });
    expect(action.actionType).toBe("add_node");
  });

  it("classifies risk and apply mode", () => {
    const safe = classifyRisk({ actionType: "move_node", nodeId: "n1", position: { x: 1, y: 2 } });
    const risky = classifyRisk({ actionType: "delete_node", nodeId: "n1" });
    expect(riskToApplyMode(safe)).toBe("auto_apply");
    expect(riskToApplyMode(risky)).toBe("hold_for_review");
  });

  it("auto-applies safe action and persists applied record", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing seeded system");
    const session = await service.createSession(ctx as never, { systemId, title: "Action" });
    const run = (await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "Annotate" })).run;
    const proposal = await repos.agentBuilder.addProposal({
      runId: run.id,
      sessionId: session.id,
      workspaceId: ctx.workspaceId,
      targetSystemId: systemId,
      actionId: "a1",
      actionType: "add_annotation",
      actor: { actorType: "user", actorId: ctx.actorId, workspaceId: ctx.workspaceId },
      payload: { actionType: "add_annotation", body: "note" },
      rationale: "safe",
      riskClass: "safe_auto_apply",
      applyMode: "auto_apply",
      sequence: 1,
      validationStatus: "valid",
      status: "proposed",
      proposedAt: new Date().toISOString()
    });
    const applied = await service.applyProposal(ctx as never, proposal.id);
    expect(applied.status).toBe("applied");
    const actions = await service.listAppliedActions(ctx as never, { runId: run.id });
    expect(actions.length).toBe(1);
  });

  it("keeps review-required proposal pending until approved", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing seeded system");
    const session = await service.createSession(ctx as never, { systemId, title: "Review" });
    const run = (await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "Delete" })).run;
    const proposal = await repos.agentBuilder.addProposal({
      runId: run.id,
      sessionId: session.id,
      workspaceId: ctx.workspaceId,
      targetSystemId: systemId,
      actionId: "a2",
      actionType: "delete_node",
      actor: { actorType: "user", actorId: ctx.actorId, workspaceId: ctx.workspaceId },
      payload: { actionType: "delete_node", nodeId: "n_ghost" },
      rationale: "risky",
      riskClass: "review_required",
      applyMode: "hold_for_review",
      sequence: 1,
      validationStatus: "valid",
      status: "pending_review",
      proposedAt: new Date().toISOString()
    });
    const pending = await repos.agentBuilder.getProposal(proposal.id);
    expect(pending?.status).toBe("pending_review");
    await service.reviewProposal(ctx as never, { proposalId: proposal.id, decision: "rejected" });
    const rejected = await repos.agentBuilder.getProposal(proposal.id);
    expect(rejected?.status).toBe("rejected");
  });
});
