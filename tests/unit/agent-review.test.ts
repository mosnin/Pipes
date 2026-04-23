import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { AgentRunService } from "@/domain/services/agent_builder";
import { AffectedRegionService, BatchReviewService, ProposalDiffService, ProposalPreviewService, ReviewSelectionService } from "@/domain/services/agent_review";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };
const now = () => new Date().toISOString();

describe("agent review diff + selective flow", () => {
  it("generates real diff records from a proposal batch", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const diffService = new ProposalDiffService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await service.createSession(ctx as never, { systemId, title: "Diff Session" });
    const run = (await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "review" })).run;

    const moveProposal = await repos.agentBuilder.addProposal({
      runId: run.id,
      sessionId: session.id,
      workspaceId: ctx.workspaceId,
      targetSystemId: systemId,
      actionId: "a1",
      actionType: "move_node",
      actor: { actorType: "user", actorId: ctx.userId, workspaceId: ctx.workspaceId },
      payload: { actionType: "move_node", nodeId: "n_1", position: { x: 320, y: 180 } },
      rationale: "subsystem_core: move for clarity",
      riskClass: "safe_auto_apply",
      applyMode: "auto_apply",
      sequence: 1,
      validationStatus: "valid",
      status: "pending_review",
      proposedAt: now()
    });

    await repos.agentBuilder.addProposalBatch({
      runId: run.id,
      workspaceId: ctx.workspaceId,
      systemId,
      stage: "propose_actions",
      summary: "batch",
      rationale: "review",
      proposalIds: [moveProposal.id],
      status: "review_required",
      createdAt: now(),
      updatedAt: now()
    });

    const batch = (await repos.agentBuilder.listProposalBatches({ runId: run.id }))[0];
    const diffs = await diffService.listBatchDiffItems(run.id, batch.id);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].changeType).toBe("move_entity");
    expect(diffs[0].proposalId).toBe(moveProposal.id);
  });

  it("blocks invalid partial selections when dependencies are missing", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const diffService = new ProposalDiffService(repos);
    const selectionService = new ReviewSelectionService(diffService);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await service.createSession(ctx as never, { systemId, title: "Selection Session" });
    const run = (await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "review" })).run;

    const deletePipe = await repos.agentBuilder.addProposal({
      runId: run.id, sessionId: session.id, workspaceId: ctx.workspaceId, targetSystemId: systemId, actionId: "a1", actionType: "delete_pipe",
      actor: { actorType: "user", actorId: ctx.userId, workspaceId: ctx.workspaceId }, payload: { actionType: "delete_pipe", pipeId: "pipe_1" },
      rationale: "subsystem_safety: remove links around n_1", riskClass: "review_required", applyMode: "hold_for_review", sequence: 1, validationStatus: "valid", status: "pending_review", proposedAt: now()
    });
    const deleteNode = await repos.agentBuilder.addProposal({
      runId: run.id, sessionId: session.id, workspaceId: ctx.workspaceId, targetSystemId: systemId, actionId: "a2", actionType: "delete_node",
      actor: { actorType: "user", actorId: ctx.userId, workspaceId: ctx.workspaceId }, payload: { actionType: "delete_node", nodeId: "n_1" },
      rationale: "subsystem_safety: delete n_1", riskClass: "review_required", applyMode: "hold_for_review", sequence: 2, validationStatus: "valid", status: "pending_review", proposedAt: now()
    });

    await repos.agentBuilder.addProposalBatch({ runId: run.id, workspaceId: ctx.workspaceId, systemId, stage: "propose_actions", summary: "batch", rationale: "review", proposalIds: [deletePipe.id, deleteNode.id], status: "review_required", createdAt: now(), updatedAt: now() });
    const batch = (await repos.agentBuilder.listProposalBatches({ runId: run.id }))[0];
    const diffs = await diffService.listBatchDiffItems(run.id, batch.id);
    const deleteNodeDiff = diffs.find((item) => item.proposalId === deleteNode.id);
    if (!deleteNodeDiff) throw new Error("missing delete node diff");

    const result = await selectionService.validateSelection(run.id, batch.id, [deleteNodeDiff.id]);
    expect(result.valid).toBe(false);
    expect(result.blockedReason).toContain("requires");
  });

  it("supports preview and affected region derivation", async () => {
    const repos = createMockRepositories();
    const service = new AgentRunService(repos);
    const diffService = new ProposalDiffService(repos);
    const previewService = new ProposalPreviewService(diffService, repos);
    const regionService = new AffectedRegionService(repos);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await service.createSession(ctx as never, { systemId, title: "Preview Session" });
    const run = (await service.createRun(ctx as never, { sessionId: session.id, systemId, message: "review" })).run;

    const addNode = await repos.agentBuilder.addProposal({
      runId: run.id, sessionId: session.id, workspaceId: ctx.workspaceId, targetSystemId: systemId, actionId: "a3", actionType: "add_node",
      actor: { actorType: "user", actorId: ctx.userId, workspaceId: ctx.workspaceId }, payload: { actionType: "add_node", nodeType: "Processor", title: "New Node", position: { x: 220, y: 140 } },
      rationale: "subsystem_core: add node", riskClass: "review_required", applyMode: "hold_for_review", sequence: 1, validationStatus: "valid", status: "pending_review", proposedAt: now()
    });

    await repos.agentBuilder.addProposalBatch({ runId: run.id, workspaceId: ctx.workspaceId, systemId, stage: "propose_actions", summary: "batch", rationale: "review", proposalIds: [addNode.id], status: "review_required", createdAt: now(), updatedAt: now() });
    const batch = (await repos.agentBuilder.listProposalBatches({ runId: run.id }))[0];
    const diffs = await diffService.listBatchDiffItems(run.id, batch.id);
    const preview = await previewService.listBatchPreview(run.id, batch.id, [diffs[0].id], true);
    const region = await regionService.deriveForBatch(run.id, batch.id, [addNode.id]);
    expect(preview[0].previewKind).toBe("addition");
    expect(preview[0].emphasis).toBe("selected_preview");
    expect(region.subsystemIds.length).toBeGreaterThan(0);
  });

  it("integrates preview -> partial approval -> apply through trusted path", async () => {
    const repos = createMockRepositories();
    const runService = new AgentRunService(repos);
    const diffService = new ProposalDiffService(repos);
    const selectionService = new ReviewSelectionService(diffService);
    const batchReview = new BatchReviewService(repos, runService, selectionService);
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("missing system");
    const session = await runService.createSession(ctx as never, { systemId, title: "Apply Session" });
    const run = (await runService.createRun(ctx as never, { sessionId: session.id, systemId, message: "review" })).run;

    const annotate = await repos.agentBuilder.addProposal({
      runId: run.id, sessionId: session.id, workspaceId: ctx.workspaceId, targetSystemId: systemId, actionId: "a4", actionType: "add_annotation",
      actor: { actorType: "user", actorId: ctx.userId, workspaceId: ctx.workspaceId }, payload: { actionType: "add_annotation", body: "safe note", nodeId: "n_1" },
      rationale: "subsystem_core: annotate", riskClass: "safe_auto_apply", applyMode: "auto_apply", sequence: 1, validationStatus: "valid", status: "pending_review", proposedAt: now()
    });
    const noOp = await repos.agentBuilder.addProposal({
      runId: run.id, sessionId: session.id, workspaceId: ctx.workspaceId, targetSystemId: systemId, actionId: "a5", actionType: "no_op_explanation",
      actor: { actorType: "user", actorId: ctx.userId, workspaceId: ctx.workspaceId }, payload: { actionType: "no_op_explanation", message: "skip" },
      rationale: "subsystem_core: skip", riskClass: "safe_auto_apply", applyMode: "auto_apply", sequence: 2, validationStatus: "valid", status: "pending_review", proposedAt: now()
    });

    await repos.agentBuilder.addProposalBatch({ runId: run.id, workspaceId: ctx.workspaceId, systemId, stage: "propose_actions", summary: "batch", rationale: "review", proposalIds: [annotate.id, noOp.id], status: "review_required", createdAt: now(), updatedAt: now() });
    const batch = (await repos.agentBuilder.listProposalBatches({ runId: run.id }))[0];
    const diffs = await diffService.listBatchDiffItems(run.id, batch.id);
    const selectedDiff = diffs.find((item) => item.proposalId === annotate.id);
    if (!selectedDiff) throw new Error("missing diff");

    const result = await batchReview.decide(ctx as never, { runId: run.id, batchId: batch.id, decision: "approve_selected", selectedDiffIds: [selectedDiff.id] });
    expect(result.status).toBe("applied");
    const applied = await runService.listAppliedActions(ctx as never, { runId: run.id });
    const proposals = await runService.listProposals(ctx as never, { runId: run.id });
    expect(applied.some((row) => row.proposalId === annotate.id)).toBe(true);
    expect(proposals.find((row) => row.id === noOp.id)?.status).toBe("rejected");
  });
});
