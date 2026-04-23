import { z } from "zod";

export const MemoryScopeSchema = z.enum(["run", "session", "system", "workspace", "pattern_library"]);
export const MemoryTypeSchema = z.enum(["plan_memory", "decision_memory", "subsystem_pattern", "builder_strategy", "validation_lesson", "naming_convention", "architecture_preference", "review_preference"]);
export const MemorySourceSchema = z.enum(["run_artifact", "user_saved", "system_inferred", "strategy_binding", "pattern_promoted"]);
export const MemoryConfidenceSchema = z.enum(["low", "medium", "high"]);
export const MemoryStatusSchema = z.enum(["active", "tentative", "rejected", "stale", "archived"]);

export const MemoryEntrySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  sessionId: z.string().optional(),
  runId: z.string().optional(),
  scope: MemoryScopeSchema,
  type: MemoryTypeSchema,
  source: MemorySourceSchema,
  confidence: MemoryConfidenceSchema,
  status: MemoryStatusSchema,
  title: z.string(),
  summary: z.string(),
  detail: z.string().optional(),
  tags: z.array(z.string()).default([]),
  provenance: z.object({
    proposalId: z.string().optional(),
    batchId: z.string().optional(),
    decisionRecordId: z.string().optional(),
    patternArtifactId: z.string().optional(),
    createdBy: z.string().optional()
  }).optional(),
  staleAfter: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const BuilderStrategyNameSchema = z.enum(["architecture_first", "template_first", "subsystem_first", "validation_heavy", "cautious_review", "aggressive_draft_then_review"]);
export const BuilderStrategySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  scope: z.enum(["workspace", "system"]),
  name: BuilderStrategyNameSchema,
  summary: z.string(),
  planningDirectives: z.array(z.string()).default([]),
  batchingDirectives: z.array(z.string()).default([]),
  reviewPosture: z.string(),
  confidence: MemoryConfidenceSchema,
  status: MemoryStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export const PatternArtifactSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  runId: z.string().optional(),
  scope: z.enum(["system", "workspace", "pattern_library"]),
  title: z.string(),
  summary: z.string(),
  intendedUse: z.string(),
  inputContractSummary: z.string(),
  outputContractSummary: z.string(),
  riskNotes: z.string(),
  tags: z.array(z.string()).default([]),
  provenance: z.object({ proposalId: z.string().optional(), batchId: z.string().optional(), subsystemId: z.string().optional(), createdBy: z.string().optional() }).optional(),
  status: MemoryStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ReusableSubsystemPatternSchema = z.object({
  id: z.string(),
  patternArtifactId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  subsystemId: z.string(),
  subsystemSummary: z.string(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const DecisionRecordSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  systemId: z.string().optional(),
  runId: z.string().optional(),
  category: z.enum(["decomposition", "naming", "review_policy", "guardrail", "template_preference", "architecture_direction"]),
  title: z.string(),
  decision: z.string(),
  rationale: z.string(),
  state: z.enum(["accepted", "rejected", "tentative"]),
  confidence: MemoryConfidenceSchema,
  staleAfter: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const SessionContinuationRefSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  fromRunId: z.string(),
  toRunId: z.string(),
  attachedMemoryEntryIds: z.array(z.string()).default([]),
  attachedPatternIds: z.array(z.string()).default([]),
  attachedDecisionIds: z.array(z.string()).default([]),
  strategyId: z.string().optional(),
  summary: z.string(),
  createdAt: z.string()
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type BuilderStrategy = z.infer<typeof BuilderStrategySchema>;
export type PatternArtifact = z.infer<typeof PatternArtifactSchema>;
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
export type ReusableSubsystemPattern = z.infer<typeof ReusableSubsystemPatternSchema>;
export type SessionContinuationRef = z.infer<typeof SessionContinuationRefSchema>;
