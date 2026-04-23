import { z } from "zod";

export const EvaluationScopeSchema = z.enum(["run", "plan", "proposal_batch", "applied_change", "strategy", "skill", "pattern"]);
export const EvaluationTypeSchema = z.enum(["validation_quality", "approval_quality", "user_acceptance_quality", "diff_quality", "strategy_effectiveness", "skill_effectiveness", "pattern_reuse_quality", "run_outcome_quality"]);
export const EvaluationStatusSchema = z.enum(["computed", "reviewed", "superseded"]);
export const EvaluationOutcomeSchema = z.enum(["excellent", "good", "mixed", "poor"]);

export const EvaluationScoreSchema = z.object({ value: z.number().min(0).max(1), label: z.string() });
export const EvaluationSignalSchema = z.object({ key: z.string(), value: z.number(), explanation: z.string() });

export const EvaluationRecordSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  runId: z.string().optional(),
  scope: EvaluationScopeSchema,
  type: EvaluationTypeSchema,
  status: EvaluationStatusSchema,
  score: EvaluationScoreSchema,
  outcome: EvaluationOutcomeSchema,
  rationale: z.string(),
  signals: z.array(EvaluationSignalSchema).default([]),
  subjectRef: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const StrategyPerformanceRecordSchema = z.object({
  id: z.string(), workspaceId: z.string(), systemId: z.string().optional(), strategyId: z.string(), strategyName: z.string(), runId: z.string(), acceptanceRate: z.number(), validationScore: z.number(), reviewFriction: z.number(), overallScore: z.number(), notes: z.string(), createdAt: z.string()
});

export const SkillPerformanceRecordSchema = z.object({
  id: z.string(), workspaceId: z.string(), systemId: z.string(), runId: z.string(), skillId: z.string(), role: z.string(), successRate: z.number(), acceptedBatchRate: z.number(), validationImpact: z.number(), overallScore: z.number(), notes: z.string(), createdAt: z.string()
});

export const PatternPromotionRecordSchema = z.object({
  id: z.string(), workspaceId: z.string(), systemId: z.string(), patternArtifactId: z.string(), reason: z.string(), evidenceScore: z.number(), createdAt: z.string()
});

export const PatternDemotionRecordSchema = z.object({
  id: z.string(), workspaceId: z.string(), systemId: z.string(), patternArtifactId: z.string(), reason: z.string(), evidenceScore: z.number(), createdAt: z.string()
});

export const LearningArtifactSchema = z.object({
  id: z.string(), workspaceId: z.string(), systemId: z.string().optional(), runId: z.string().optional(), type: z.enum(["strategy_lesson", "skill_lesson", "pattern_lesson", "batch_lesson", "run_lesson"]), title: z.string(), summary: z.string(), confidence: z.enum(["low", "medium", "high"]), sourceEvaluationIds: z.array(z.string()).default([]), createdAt: z.string()
});

export type EvaluationRecord = z.infer<typeof EvaluationRecordSchema>;
export type StrategyPerformanceRecord = z.infer<typeof StrategyPerformanceRecordSchema>;
export type SkillPerformanceRecord = z.infer<typeof SkillPerformanceRecordSchema>;
export type PatternPromotionRecord = z.infer<typeof PatternPromotionRecordSchema>;
export type PatternDemotionRecord = z.infer<typeof PatternDemotionRecordSchema>;
export type LearningArtifact = z.infer<typeof LearningArtifactSchema>;
