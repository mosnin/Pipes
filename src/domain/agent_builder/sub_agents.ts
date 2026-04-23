import { z } from "zod";
import { RunStageSchema } from "@/domain/agent_builder/staged";

export const SubAgentRoleSchema = z.enum(["architect_sub_agent", "subsystem_builder_sub_agent", "validation_sub_agent", "diff_reviewer_sub_agent", "template_matcher_sub_agent"]);
export const SubAgentTaskStatusSchema = z.enum(["queued", "running", "completed", "failed", "blocked"]);

export const SubAgentContextPackSchema = z.object({
  subsystemId: z.string(),
  subsystemSummary: z.string(),
  selectedNodeIds: z.array(z.string()).default([]),
  localContracts: z.array(z.string()).default([]),
  adjacentSubsystemSummaries: z.array(z.string()).default([]),
  systemGoalSummary: z.string(),
  relevantValidationIssues: z.array(z.string()).default([]),
  stage: RunStageSchema,
  recentRunNotes: z.array(z.string()).default([])
});

export const SkillDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  expectedInput: z.string(),
  allowedTools: z.array(z.string()),
  expectedOutputType: z.string(),
  reviewPolicyHints: z.array(z.string()).default([]),
  qualityConstraints: z.array(z.string()).default([])
});

export const SkillInvocationSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  skillId: z.string(),
  inputSummary: z.string(),
  status: z.enum(["started", "completed", "failed"]),
  outputSummary: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional()
});

export const SubAgentTaskSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  stage: RunStageSchema,
  role: SubAgentRoleSchema,
  skillId: z.string(),
  title: z.string(),
  contextPack: SubAgentContextPackSchema,
  status: SubAgentTaskStatusSchema,
  createdAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional()
});

export const SubAgentResultSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  planSummary: z.string().optional(),
  critique: z.string().optional(),
  proposedActionTypes: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  conflictSignals: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const OrchestrationStepSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  stage: RunStageSchema,
  decision: z.string(),
  summary: z.string(),
  at: z.string()
});

export const ReconciliationRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  inputTaskIds: z.array(z.string()),
  decision: z.enum(["merged", "review_required", "blocked", "question_raised"]),
  summary: z.string(),
  createdAt: z.string()
});

export type SubAgentTask = z.infer<typeof SubAgentTaskSchema>;
export type SubAgentResult = z.infer<typeof SubAgentResultSchema>;
export type SkillInvocation = z.infer<typeof SkillInvocationSchema>;
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export type OrchestrationStep = z.infer<typeof OrchestrationStepSchema>;
export type ReconciliationRecord = z.infer<typeof ReconciliationRecordSchema>;
