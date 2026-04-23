import { z } from "zod";

export const HandoffPackageStatusSchema = z.enum(["draft", "in_review", "approved", "rejected", "revision_requested", "exported"]);
export const HandoffArtifactTypeSchema = z.enum([
  "implementation_plan",
  "system_summary",
  "architecture_spec",
  "task_breakdown",
  "dependency_manifest",
  "environment_manifest",
  "api_contract_summary",
  "data_model_summary",
  "coding_agent_prompt",
  "qa_checklist",
  "rollout_checklist",
  "risk_register"
]);
export const HandoffTargetSchema = z.enum(["human_engineer", "codex", "claude_code", "general_llm_builder"]);

export const HandoffAcceptanceCriteriaSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(["pending", "satisfied", "blocked"])
});

export const HandoffArtifactSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  type: HandoffArtifactTypeSchema,
  target: HandoffTargetSchema,
  title: z.string(),
  content: z.string(),
  sourceRefs: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const HandoffVersionSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  version: z.number(),
  summary: z.string(),
  createdAt: z.string(),
  createdBy: z.string()
});

export const HandoffPackageSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  systemId: z.string(),
  sourceRunId: z.string().optional(),
  status: HandoffPackageStatusSchema,
  target: HandoffTargetSchema,
  version: z.number(),
  title: z.string(),
  generatedAt: z.string(),
  generatedBy: z.string(),
  lineage: z.object({ systemVersionCount: z.number(), acceptedProposalCount: z.number(), approvedBy: z.string().optional() })
});

export const HandoffGenerationRecordSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  systemId: z.string(),
  target: HandoffTargetSchema,
  assumptions: z.array(z.string()).default([]),
  unresolvedAmbiguities: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const HandoffReviewDecisionSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  decision: z.enum(["approved", "rejected", "revision_requested"]),
  note: z.string().optional(),
  decidedBy: z.string(),
  decidedAt: z.string()
});

export const HandoffExportRecordSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  target: HandoffTargetSchema,
  format: z.enum(["markdown_bundle", "json_manifest", "prompt_pack_text"]),
  exportedAt: z.string(),
  exportedBy: z.string(),
  digest: z.string()
});

export type HandoffPackage = z.infer<typeof HandoffPackageSchema>;
export type HandoffPackageStatus = z.infer<typeof HandoffPackageStatusSchema>;
export type HandoffArtifact = z.infer<typeof HandoffArtifactSchema>;
export type HandoffArtifactType = z.infer<typeof HandoffArtifactTypeSchema>;
export type HandoffTarget = z.infer<typeof HandoffTargetSchema>;
export type HandoffVersion = z.infer<typeof HandoffVersionSchema>;
export type HandoffGenerationRecord = z.infer<typeof HandoffGenerationRecordSchema>;
export type HandoffReviewDecision = z.infer<typeof HandoffReviewDecisionSchema>;
export type HandoffExportRecord = z.infer<typeof HandoffExportRecordSchema>;
export type HandoffAcceptanceCriteria = z.infer<typeof HandoffAcceptanceCriteriaSchema>;
