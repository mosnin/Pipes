import { z } from "zod";

export const ReviewParticipantStatusSchema = z.enum(["active", "idle", "reviewing", "handoff_pending", "offline"]);
export const CommentTargetTypeSchema = z.enum(["run", "plan_revision", "proposal_batch", "diff_item", "approval_request", "learning_artifact"]);
export const ReviewThreadStatusSchema = z.enum(["open", "resolved", "closed"]);
export const HandoffStatusSchema = z.enum(["pending", "accepted", "declined", "completed"]);

export const RunReviewerSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  userId: z.string(),
  role: z.string(),
  status: ReviewParticipantStatusSchema,
  joinedAt: z.string(),
  updatedAt: z.string()
});

export const SharedRunVisibilityStateSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  userId: z.string(),
  mode: z.enum(["viewing", "reviewing", "approving", "handoff"]),
  currentStage: z.string().optional(),
  viewedAt: z.string(),
  updatedAt: z.string()
});

export const ReviewThreadSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  targetType: CommentTargetTypeSchema,
  targetId: z.string(),
  diffLineageRef: z.string().optional(),
  status: ReviewThreadStatusSchema,
  createdBy: z.string(),
  createdAt: z.string(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().optional()
});

export const ReviewCommentSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  targetType: CommentTargetTypeSchema,
  targetId: z.string(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.string()
});

export const ReviewDecisionRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  approvalRequestId: z.string().optional(),
  batchId: z.string().optional(),
  actorId: z.string(),
  decision: z.enum(["recommend_approve", "recommend_reject", "object", "final_approved", "final_rejected"]),
  note: z.string(),
  createdAt: z.string()
});

export const ApprovalParticipantRecordSchema = z.object({
  id: z.string(),
  approvalRequestId: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  actorId: z.string(),
  recommendation: z.enum(["approve", "reject", "needs_revision", "comment_only"]),
  note: z.string().optional(),
  createdAt: z.string()
});

export const HandoffRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  fromUserId: z.string(),
  toUserId: z.string(),
  note: z.string(),
  stage: z.string(),
  pendingApprovalCount: z.number(),
  openQuestions: z.array(z.string()).default([]),
  unresolvedThreadIds: z.array(z.string()).default([]),
  status: HandoffStatusSchema,
  createdAt: z.string(),
  respondedAt: z.string().optional()
});

export const RevisionRequestSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  targetType: z.enum(["proposal_batch", "diff_item"]),
  targetId: z.string(),
  requestedBy: z.string(),
  rationale: z.string(),
  requestedOutcome: z.string(),
  status: z.enum(["open", "addressed", "declined"]),
  createdAt: z.string(),
  resolvedAt: z.string().optional()
});

export type ReviewComment = z.infer<typeof ReviewCommentSchema>;
export type ReviewThread = z.infer<typeof ReviewThreadSchema>;
export type RunReviewer = z.infer<typeof RunReviewerSchema>;
export type ReviewDecisionRecord = z.infer<typeof ReviewDecisionRecordSchema>;
export type ApprovalParticipantRecord = z.infer<typeof ApprovalParticipantRecordSchema>;
export type HandoffRecord = z.infer<typeof HandoffRecordSchema>;
export type SharedRunVisibilityState = z.infer<typeof SharedRunVisibilityStateSchema>;
export type RevisionRequest = z.infer<typeof RevisionRequestSchema>;
