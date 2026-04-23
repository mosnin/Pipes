import { z } from "zod";

export const SandboxSessionStatusSchema = z.enum(["created", "active", "paused", "completed", "failed", "expired"]);
export const SandboxArtifactTypeSchema = z.enum(["generated_file", "text_bundle", "markdown_bundle", "json_bundle", "prompt_pack", "comparison_report", "analysis_report", "preview_snapshot", "handoff_bundle", "evaluation_bundle"]);

export const WorkspaceMountRefSchema = z.object({ id: z.string(), workspaceId: z.string(), mountType: z.enum(["handoff_context", "system_export", "prompt_pack", "schema_summary", "artifact_template"]), pathHint: z.string(), createdAt: z.string() });
export const FileBundleRefSchema = z.object({ id: z.string(), workspaceId: z.string(), runId: z.string().optional(), taskId: z.string().optional(), bundleType: z.enum(["handoff_context", "system_export", "prompt_pack", "schema_summary", "artifact_template"]), fileCount: z.number(), checksum: z.string(), createdAt: z.string() });

export const SandboxSessionSchema = z.object({ id: z.string(), workspaceId: z.string(), runId: z.string(), taskId: z.string(), status: SandboxSessionStatusSchema, executionTarget: z.enum(["modal_worker", "modal_sandbox"]), mountRefs: z.array(WorkspaceMountRefSchema).default([]), fileBundleRef: FileBundleRefSchema.optional(), resumeToken: z.string().optional(), createdAt: z.string(), updatedAt: z.string() });

export const SandboxArtifactSchema = z.object({ id: z.string(), workspaceId: z.string(), runId: z.string(), taskId: z.string(), sessionId: z.string(), type: SandboxArtifactTypeSchema, title: z.string(), rawContent: z.string(), normalizedContent: z.string().optional(), normalized: z.boolean(), summary: z.string(), status: z.enum(["generated", "normalization_failed", "normalized"]), createdAt: z.string() });

export const ArtifactPreviewSchema = z.object({ artifactId: z.string(), previewType: z.enum(["text", "markdown", "json"]), content: z.string(), truncated: z.boolean(), generatedAt: z.string() });
export const SandboxArtifactSummarySchema = z.object({ artifactId: z.string(), type: SandboxArtifactTypeSchema, status: z.string(), summary: z.string(), normalized: z.boolean(), generatedAt: z.string(), sourceTaskId: z.string(), sourceRunId: z.string() });
export const SandboxOutputBundleSchema = z.object({ sessionId: z.string(), artifactIds: z.array(z.string()).default([]), normalizationRecordIds: z.array(z.string()).default([]), generatedAt: z.string() });
export const ArtifactNormalizationRecordSchema = z.object({ id: z.string(), artifactId: z.string(), sessionId: z.string(), status: z.enum(["succeeded", "failed", "partial"]), rulesVersion: z.string(), note: z.string().optional(), createdAt: z.string() });

export type SandboxSession = z.infer<typeof SandboxSessionSchema>;
export type SandboxSessionStatus = z.infer<typeof SandboxSessionStatusSchema>;
export type SandboxArtifact = z.infer<typeof SandboxArtifactSchema>;
export type SandboxArtifactType = z.infer<typeof SandboxArtifactTypeSchema>;
export type SandboxArtifactSummary = z.infer<typeof SandboxArtifactSummarySchema>;
export type SandboxOutputBundle = z.infer<typeof SandboxOutputBundleSchema>;
export type WorkspaceMountRef = z.infer<typeof WorkspaceMountRefSchema>;
export type FileBundleRef = z.infer<typeof FileBundleRefSchema>;
export type ArtifactPreview = z.infer<typeof ArtifactPreviewSchema>;
export type ArtifactNormalizationRecord = z.infer<typeof ArtifactNormalizationRecordSchema>;
