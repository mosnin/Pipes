import { z } from "zod";

export const DiffEntityTypeSchema = z.enum(["node", "pipe", "annotation", "group", "system_metadata", "contract"]);
export const DiffChangeTypeSchema = z.enum(["add_entity", "update_entity", "remove_entity", "move_entity", "reconnect_pipe", "metadata_change", "structural_regrouping", "annotation_change"]);
export const DiffRiskLevelSchema = z.enum(["low", "medium", "high"]);

export const ProposalDiffItemSchema = z.object({
  id: z.string(),
  proposalId: z.string(),
  batchId: z.string(),
  entityType: DiffEntityTypeSchema,
  entityId: z.string(),
  changeType: DiffChangeTypeSchema,
  summary: z.string(),
  rationale: z.string(),
  riskLevel: DiffRiskLevelSchema,
  affectedRegion: z.string(),
  affectedSubsystem: z.string(),
  canSelectIndividually: z.boolean(),
  dependencies: z.array(z.string()).default([]),
  provenance: z.object({ role: z.string().optional(), skillId: z.string().optional(), taskId: z.string().optional() }).optional()
});

export const BatchPreviewItemSchema = z.object({
  diffId: z.string(),
  entityType: DiffEntityTypeSchema,
  entityId: z.string(),
  changeType: DiffChangeTypeSchema,
  previewKind: z.enum(["addition", "deletion", "movement", "connection", "annotation", "metadata"]),
  emphasis: z.enum(["pending_review", "selected_preview", "applied"]),
  x: z.number().optional(),
  y: z.number().optional()
});

export type ProposalDiffItem = z.infer<typeof ProposalDiffItemSchema>;
export type BatchPreviewItem = z.infer<typeof BatchPreviewItemSchema>;
