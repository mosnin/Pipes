import { z } from "zod";

export const RunControlActionSchema = z.enum(["pause", "resume", "cancel", "retry", "fork", "replay", "compare"]);
export const RunControlStatusSchema = z.enum(["requested", "applied", "rejected"]);

export const RunPauseRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), actorId: z.string(), reason: z.string(), status: RunControlStatusSchema, createdAt: z.string() });
export const RunResumeRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), actorId: z.string(), status: RunControlStatusSchema, createdAt: z.string() });
export const RunCancelRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), actorId: z.string(), reason: z.string(), status: RunControlStatusSchema, createdAt: z.string() });
export const RunRetryRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), actorId: z.string(), sourceRunId: z.string(), status: RunControlStatusSchema, createdAt: z.string() });
export const RunForkRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), actorId: z.string(), sourceRunId: z.string(), contextCopied: z.boolean(), status: RunControlStatusSchema, createdAt: z.string() });
export const RunReplayRecordSchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), openedBy: z.string(), summary: z.string(), createdAt: z.string() });
export const RunTraceSummarySchema = z.object({ id: z.string(), runId: z.string(), workspaceId: z.string(), stageCount: z.number(), toolCallCount: z.number(), proposalCount: z.number(), approvalCount: z.number(), policyDecisionCount: z.number(), escalationCount: z.number(), createdAt: z.string() });
export const RunComparisonRecordSchema = z.object({ id: z.string(), workspaceId: z.string(), leftRunId: z.string(), rightRunId: z.string(), summary: z.string(), leftScore: z.number(), rightScore: z.number(), createdAt: z.string() });

export const PromptArtifactSchema = z.object({ id: z.string(), workspaceId: z.string(), name: z.string(), description: z.string(), createdAt: z.string() });
export const PromptVersionSchema = z.object({ id: z.string(), workspaceId: z.string(), promptArtifactId: z.string(), version: z.number(), body: z.string(), status: z.enum(["active", "deprecated", "candidate"]), createdAt: z.string() });
export const StrategyVersionSchema = z.object({ id: z.string(), workspaceId: z.string(), strategyName: z.string(), version: z.number(), configJson: z.string(), status: z.enum(["active", "deprecated", "candidate"]), createdAt: z.string() });
export const SkillVersionBindingSchema = z.object({ id: z.string(), workspaceId: z.string(), skillId: z.string(), version: z.number(), status: z.enum(["active", "candidate", "disabled"]), notes: z.string(), createdAt: z.string() });
export const StrategyPresetSchema = z.object({ id: z.string(), workspaceId: z.string(), name: z.string(), strategyVersionId: z.string().optional(), promptVersionId: z.string().optional(), batchingPosture: z.enum(["small_batches", "balanced", "large_batches"]), reviewHint: z.enum(["strict", "standard", "light"]), createdAt: z.string(), updatedAt: z.string() });
export const ActiveBuilderPresetSchema = z.object({ id: z.string(), workspaceId: z.string(), presetId: z.string(), status: z.enum(["active", "inactive"]), createdAt: z.string(), updatedAt: z.string() });

export const ExperimentVariantSchema = z.object({ id: z.string(), experimentId: z.string(), name: z.string(), presetId: z.string().optional(), promptVersionId: z.string().optional(), strategyVersionId: z.string().optional(), skillBindingId: z.string().optional() });
export const ExperimentRecordSchema = z.object({ id: z.string(), workspaceId: z.string(), name: z.string(), objective: z.string(), status: z.enum(["draft", "running", "completed"]), variantIds: z.array(z.string()).default([]), createdAt: z.string() });
export const ExperimentAssignmentSchema = z.object({ id: z.string(), workspaceId: z.string(), runId: z.string(), experimentId: z.string(), variantId: z.string(), assignedAt: z.string() });
export const ExperimentOutcomeSummarySchema = z.object({ id: z.string(), workspaceId: z.string(), experimentId: z.string(), variantId: z.string(), runCount: z.number(), avgScore: z.number(), notes: z.string(), createdAt: z.string() });

export type RunTraceSummary = z.infer<typeof RunTraceSummarySchema>;
export type StrategyPreset = z.infer<typeof StrategyPresetSchema>;
export type PromptVersion = z.infer<typeof PromptVersionSchema>;
export type StrategyVersion = z.infer<typeof StrategyVersionSchema>;
export type SkillVersionBinding = z.infer<typeof SkillVersionBindingSchema>;
export type ActiveBuilderPreset = z.infer<typeof ActiveBuilderPresetSchema>;
export type ExperimentRecord = z.infer<typeof ExperimentRecordSchema>;
export type ExperimentAssignment = z.infer<typeof ExperimentAssignmentSchema>;
export type ExperimentOutcomeSummary = z.infer<typeof ExperimentOutcomeSummarySchema>;

export type RunControlAction = z.infer<typeof RunControlActionSchema>;
export type RunControlStatus = z.infer<typeof RunControlStatusSchema>;
export type RunPauseRecord = z.infer<typeof RunPauseRecordSchema>;
export type RunResumeRecord = z.infer<typeof RunResumeRecordSchema>;
export type RunCancelRecord = z.infer<typeof RunCancelRecordSchema>;
export type RunRetryRecord = z.infer<typeof RunRetryRecordSchema>;
export type RunForkRecord = z.infer<typeof RunForkRecordSchema>;
export type RunReplayRecord = z.infer<typeof RunReplayRecordSchema>;
export type RunComparisonRecord = z.infer<typeof RunComparisonRecordSchema>;
export type PromptArtifact = z.infer<typeof PromptArtifactSchema>;
export type ExperimentVariant = z.infer<typeof ExperimentVariantSchema>;
