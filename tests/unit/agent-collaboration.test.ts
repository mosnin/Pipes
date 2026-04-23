import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { AgentCollaborationService } from "@/domain/services/agent_collaboration";
import { AgentRunService } from "@/domain/services/agent_builder";

const ownerCtx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };
const editorCtx = { userId: "usr_2", workspaceId: "wks_1", role: "Editor", plan: "Pro", actorType: "user" as const, actorId: "usr_2" };

describe("agent collaboration", () => {
  it("validates comment target and supports threaded comments", async () => {
    const repos = createMockRepositories();
    const service = new AgentCollaborationService(repos);
    const runId = "run_demo";
    await expect(service.comments.addComment(ownerCtx as never, { runId, targetType: "invalid_target", targetId: "x", body: "bad" })).rejects.toThrow();
    await service.comments.addComment(ownerCtx as never, { runId, targetType: "proposal_batch", targetId: "batch_1", body: "please split" });
    const result = await service.comments.list(ownerCtx as never, { runId, targetType: "proposal_batch", targetId: "batch_1" });
    expect(result.threads.length).toBe(1);
    expect(result.comments.length).toBe(1);
  });

  it("enforces final approval authority to owner/admin", async () => {
    const repos = createMockRepositories();
    const service = new AgentCollaborationService(repos);
    await expect(service.approvals.addDecision(editorCtx as never, { runId: "r1", decision: "final_approved", note: "ship" })).rejects.toThrow("final_approval_requires_owner_or_admin");
    await expect(service.approvals.addDecision(ownerCtx as never, { runId: "r1", decision: "final_approved", note: "ship" })).resolves.toBeTruthy();
  });

  it("creates and accepts handoff with typed status", async () => {
    const repos = createMockRepositories();
    const service = new AgentCollaborationService(repos);
    const handoff = await service.handoffs.create(ownerCtx as never, { runId: "r2", systemId: "sys_1", toUserId: "usr_2", note: "please continue review" });
    expect(handoff.status).toBe("pending");
    await service.handoffs.accept(ownerCtx as never, { handoffId: handoff.id, systemId: "sys_1" });
    const stored = await repos.agentBuilder.listHandoffRecords({ runId: "r2" });
    expect(stored[0]?.status).toBe("accepted");
  });

  it("creates revision request and marks run as revision requested", async () => {
    const repos = createMockRepositories();
    const runService = new AgentRunService(repos);
    const collab = new AgentCollaborationService(repos);
    const systemId = (await repos.systems.list(ownerCtx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await runService.createSession(ownerCtx as never, { systemId, title: "rev" });
    const created = await runService.createRun(ownerCtx as never, { sessionId: session.id, systemId, message: "help" });
    await collab.negotiation.requestRevision(ownerCtx as never, { runId: created.run.id, systemId, targetType: "proposal_batch", targetId: "batch_1", rationale: "split risky parts", requestedOutcome: "safe subset first" });
    const revisions = await repos.agentBuilder.listRevisionRequests({ runId: created.run.id });
    expect(revisions.length).toBe(1);
  });

  it("supports multi-user collaborative review on a proposal batch and handoff continuation", async () => {
    const repos = createMockRepositories();
    await repos.memberships.add("wks_1", "usr_2", "Editor");
    const runService = new AgentRunService(repos);
    const collab = new AgentCollaborationService(repos);
    const systemId = (await repos.systems.list(ownerCtx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await runService.createSession(ownerCtx as never, { systemId, title: "collab" });
    const created = await runService.createRun(ownerCtx as never, { sessionId: session.id, systemId, message: "delete unstable nodes" });
    await runService.streamRun(ownerCtx as never, { runId: created.run.id, message: "delete unstable nodes", systemName: "Demo" });
    const batches = await runService.listProposalBatches(ownerCtx as never, created.run.id);
    if (!batches[0]) throw new Error("missing batch");
    await collab.upsertPresence(ownerCtx as never, { runId: created.run.id, systemId, mode: "reviewing" });
    await collab.upsertPresence(editorCtx as never, { runId: created.run.id, systemId, mode: "reviewing" });
    await collab.comments.addComment(editorCtx as never, { runId: created.run.id, systemId, targetType: "proposal_batch", targetId: batches[0].id, body: "request split" });
    const handoff = await collab.handoffs.create(ownerCtx as never, { runId: created.run.id, systemId, toUserId: "usr_2", note: "please finish" });
    await collab.handoffs.accept(editorCtx as never, { handoffId: handoff.id, systemId });
    const state = await collab.getRunCollaboration(ownerCtx as never, { runId: created.run.id });
    expect(state.reviewers.length).toBeGreaterThanOrEqual(2);
    expect(state.comments.length).toBeGreaterThan(0);
    expect(state.handoffs.some((h) => h.status === "accepted")).toBe(true);
  }, 20000);
});
