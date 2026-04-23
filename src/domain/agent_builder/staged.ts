import { z } from "zod";

export const RunStageSchema = z.enum([
  "intake",
  "inspect_context",
  "plan",
  "design_structure",
  "validate_design",
  "propose_actions",
  "wait_for_approval",
  "apply",
  "summarize",
  "completed",
  "blocked",
  "failed"
]);
export type RunStage = z.infer<typeof RunStageSchema>;

export const SpecialistRoleSchema = z.enum(["architect", "validator", "builder", "explainer"]);
export type SpecialistRole = z.infer<typeof SpecialistRoleSchema>;

export const PlanRevisionSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  version: z.number(),
  summary: z.string(),
  critique: z.string().optional(),
  assumptions: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  unresolvedRisks: z.array(z.string()).default([]),
  recommendedNextSteps: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const RoleActivitySchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  stage: RunStageSchema,
  role: SpecialistRoleSchema,
  summary: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional()
});

export const ProposalBatchSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  stage: RunStageSchema,
  summary: z.string(),
  rationale: z.string(),
  proposalIds: z.array(z.string()),
  status: z.enum(["created", "auto_applied", "review_required", "approved", "rejected"]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const StageRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  stage: RunStageSchema,
  status: z.enum(["entered", "completed", "revisited"]),
  summary: z.string().optional(),
  at: z.string()
});

export type PlanRevision = z.infer<typeof PlanRevisionSchema>;
export type RoleActivity = z.infer<typeof RoleActivitySchema>;
export type ProposalBatch = z.infer<typeof ProposalBatchSchema>;
export type StageRecord = z.infer<typeof StageRecordSchema>;
