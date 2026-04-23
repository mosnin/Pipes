import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import { CommentTargetTypeSchema, HandoffRecordSchema, ReviewCommentSchema, ReviewDecisionRecordSchema, RevisionRequestSchema, type HandoffRecord } from "@/domain/agent_builder/collaboration";

const now = () => new Date().toISOString();

export class ReviewCommentService {
  constructor(private readonly repos: RepositorySet) {}
  async addComment(ctx: AppContext, input: { runId: string; systemId?: string; targetType: string; targetId: string; threadId?: string; body: string; diffLineageRef?: string }) {
    const targetType = CommentTargetTypeSchema.parse(input.targetType);
    let threadId = input.threadId;
    if (!threadId) {
      const thread = await this.repos.agentBuilder.addReviewThread({ runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId, targetType, targetId: input.targetId, diffLineageRef: input.diffLineageRef, status: "open", createdBy: ctx.userId, createdAt: now() });
      threadId = thread.id;
    }
    const comment = await this.repos.agentBuilder.addReviewComment(ReviewCommentSchema.omit({ id: true }).parse({ threadId, runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId, targetType, targetId: input.targetId, authorId: ctx.userId, body: input.body, createdAt: now() }));
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "review_comment_added", targetType: "review_comment", targetId: comment.id, outcome: "success" });
    return comment;
  }
  async list(ctx: AppContext, input: { runId: string; targetType?: string; targetId?: string }) {
    const [threads, comments] = await Promise.all([
      this.repos.agentBuilder.listReviewThreads({ runId: input.runId, targetType: input.targetType as any, targetId: input.targetId }),
      this.repos.agentBuilder.listReviewComments({ runId: input.runId, targetType: input.targetType as any, targetId: input.targetId })
    ]);
    return { threads, comments };
  }
  async resolveThread(ctx: AppContext, input: { threadId: string; systemId?: string }) {
    await this.repos.agentBuilder.resolveReviewThread({ threadId: input.threadId, status: "resolved", resolvedBy: ctx.userId, resolvedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "review_thread_resolved", targetType: "review_thread", targetId: input.threadId, outcome: "success" });
  }
}

export class ApprovalCollaborationService {
  constructor(private readonly repos: RepositorySet) {}
  private canFinalApprove(ctx: AppContext) { return ctx.role === "Owner" || ctx.role === "Admin"; }

  async addApprovalFeedback(ctx: AppContext, input: { runId: string; approvalRequestId: string; recommendation: "approve" | "reject" | "needs_revision" | "comment_only"; note?: string; systemId?: string }) {
    const record = await this.repos.agentBuilder.addApprovalParticipantRecord({ approvalRequestId: input.approvalRequestId, runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId, actorId: ctx.userId, recommendation: input.recommendation, note: input.note, createdAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "approval_feedback_added", targetType: "approval_feedback", targetId: record.id, outcome: "success" });
    return record;
  }

  async addDecision(ctx: AppContext, input: { runId: string; approvalRequestId?: string; batchId?: string; decision: "recommend_approve" | "recommend_reject" | "object" | "final_approved" | "final_rejected"; note: string; systemId?: string }) {
    if ((input.decision === "final_approved" || input.decision === "final_rejected") && !this.canFinalApprove(ctx)) throw new Error("final_approval_requires_owner_or_admin");
    const record = await this.repos.agentBuilder.addReviewDecisionRecord(ReviewDecisionRecordSchema.omit({ id: true }).parse({ runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId, approvalRequestId: input.approvalRequestId, batchId: input.batchId, actorId: ctx.userId, decision: input.decision, note: input.note, createdAt: now() }));
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: input.decision === "final_approved" ? "final_approval_granted" : input.decision === "final_rejected" ? "final_approval_rejected" : "approval_feedback_added", targetType: "review_decision", targetId: record.id, outcome: "success" });
    return record;
  }
}

export class RunHandoffService {
  constructor(private readonly repos: RepositorySet) {}
  async create(ctx: AppContext, input: { runId: string; systemId?: string; toUserId: string; note: string }) {
    const [stages, approvals, revisions, threads] = await Promise.all([
      this.repos.agentBuilder.listStageRecords({ runId: input.runId }),
      this.repos.agentBuilder.listApprovalRequests({ runId: input.runId, status: "pending" }),
      this.repos.agentBuilder.listPlanRevisions({ runId: input.runId }),
      this.repos.agentBuilder.listReviewThreads({ runId: input.runId })
    ]);
    const handoff = await this.repos.agentBuilder.addHandoffRecord(HandoffRecordSchema.omit({ id: true }).parse({
      runId: input.runId,
      workspaceId: ctx.workspaceId,
      systemId: input.systemId,
      fromUserId: ctx.userId,
      toUserId: input.toUserId,
      note: input.note,
      stage: stages.at(-1)?.stage ?? "unknown",
      pendingApprovalCount: approvals.length,
      openQuestions: revisions.flatMap((r) => r.openQuestions).slice(0, 6),
      unresolvedThreadIds: threads.filter((t) => t.status === "open").map((t) => t.id),
      status: "pending",
      createdAt: now()
    }));
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "run_handoff_created", targetType: "handoff", targetId: handoff.id, outcome: "success" });
    return handoff;
  }
  async accept(ctx: AppContext, input: { handoffId: string; systemId?: string }) {
    await this.repos.agentBuilder.updateHandoffStatus({ handoffId: input.handoffId, status: "accepted", respondedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "run_handoff_accepted", targetType: "handoff", targetId: input.handoffId, outcome: "success" });
  }
}

export class ReviewNegotiationService {
  constructor(private readonly repos: RepositorySet) {}
  async requestRevision(ctx: AppContext, input: { runId: string; systemId?: string; targetType: "proposal_batch" | "diff_item"; targetId: string; rationale: string; requestedOutcome: string }) {
    const revision = await this.repos.agentBuilder.addRevisionRequest(RevisionRequestSchema.omit({ id: true }).parse({ runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId, targetType: input.targetType, targetId: input.targetId, requestedBy: ctx.userId, rationale: input.rationale, requestedOutcome: input.requestedOutcome, status: "open", createdAt: now() }));
    await this.repos.agentBuilder.updateRun({ runId: input.runId, status: "revision_requested", error: "revision_requested" });
    await this.repos.agentBuilder.addStageRecord({ runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId!, stage: "validate_design", status: "revisited", summary: `revision requested: ${input.targetType}:${input.targetId}`, at: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "revision_requested", targetType: "revision_request", targetId: revision.id, outcome: "success" });
    return revision;
  }
}

export class AgentCollaborationService {
  readonly comments: ReviewCommentService;
  readonly approvals: ApprovalCollaborationService;
  readonly handoffs: RunHandoffService;
  readonly negotiation: ReviewNegotiationService;
  constructor(private readonly repos: RepositorySet) {
    this.comments = new ReviewCommentService(repos);
    this.approvals = new ApprovalCollaborationService(repos);
    this.handoffs = new RunHandoffService(repos);
    this.negotiation = new ReviewNegotiationService(repos);
  }

  async upsertPresence(ctx: AppContext, input: { runId: string; systemId?: string; mode: "viewing" | "reviewing" | "approving" | "handoff"; currentStage?: string }) {
    const reviewer = await this.repos.agentBuilder.upsertRunReviewer({ runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId, userId: ctx.userId, role: ctx.role, status: input.mode === "reviewing" ? "reviewing" : "active", joinedAt: now(), updatedAt: now() });
    const visibility = await this.repos.agentBuilder.upsertSharedRunVisibility({ runId: input.runId, workspaceId: ctx.workspaceId, systemId: input.systemId, userId: ctx.userId, mode: input.mode, currentStage: input.currentStage, viewedAt: now(), updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as any, action: "run_shared_view_opened", targetType: "agent_run", targetId: input.runId, outcome: "success" });
    return { reviewer, visibility };
  }

  async getRunCollaboration(ctx: AppContext, input: { runId: string }) {
    const [reviewers, visibility, threads, comments, handoffs, decisions, approvalParticipants, revisions] = await Promise.all([
      this.repos.agentBuilder.listRunReviewers({ runId: input.runId }),
      this.repos.agentBuilder.listSharedRunVisibility({ runId: input.runId }),
      this.repos.agentBuilder.listReviewThreads({ runId: input.runId }),
      this.repos.agentBuilder.listReviewComments({ runId: input.runId }),
      this.repos.agentBuilder.listHandoffRecords({ runId: input.runId }),
      this.repos.agentBuilder.listReviewDecisionRecords({ runId: input.runId }),
      this.repos.agentBuilder.listApprovalParticipantRecords({ runId: input.runId }),
      this.repos.agentBuilder.listRevisionRequests({ runId: input.runId })
    ]);
    return { reviewers, visibility, threads, comments, handoffs, decisions, approvalParticipants, revisions };
  }
}
