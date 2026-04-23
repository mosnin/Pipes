import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { ArtifactNormalizationRecord, ArtifactPreview, SandboxArtifact, SandboxArtifactSummary, SandboxOutputBundle } from "@/domain/runtime/sandbox";

const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export class SandboxArtifactService {
  constructor(private readonly repos: RepositorySet) {}

  async createFromRaw(ctx: AppContext, input: { runId: string; taskId: string; sessionId: string; type: SandboxArtifact["type"]; title: string; rawContent: string }) {
    const artifact: SandboxArtifact = { id: id("sart"), workspaceId: ctx.workspaceId, runId: input.runId, taskId: input.taskId, sessionId: input.sessionId, type: input.type, title: input.title, rawContent: input.rawContent, normalized: false, summary: input.rawContent.slice(0, 120), status: "generated", createdAt: now() };
    await this.persistArtifact(ctx, artifact);
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "sandbox_artifact_generated", targetType: "sandbox_artifact", targetId: artifact.id, outcome: "success" });
    return artifact;
  }

  async normalize(ctx: AppContext, artifactId: string, normalizer: (raw: string) => string) {
    const artifact = await this.getArtifact(ctx, artifactId);
    try {
      const normalizedContent = normalizer(artifact.rawContent);
      const updated: SandboxArtifact = { ...artifact, normalizedContent, normalized: true, status: "normalized", summary: normalizedContent.slice(0, 120) };
      const record: ArtifactNormalizationRecord = { id: id("anr"), artifactId: artifact.id, sessionId: artifact.sessionId, status: "succeeded", rulesVersion: "v1", createdAt: now() };
      await this.persistArtifact(ctx, updated);
      await this.persistNormalization(ctx, record, artifact.runId, artifact.taskId);
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "sandbox_artifact_normalized", targetType: "sandbox_artifact", targetId: artifact.id, outcome: "success" });
      return { artifact: updated, normalization: record };
    } catch (error) {
      const failed: ArtifactNormalizationRecord = { id: id("anr"), artifactId: artifact.id, sessionId: artifact.sessionId, status: "failed", rulesVersion: "v1", note: (error as Error).message, createdAt: now() };
      const updated: SandboxArtifact = { ...artifact, status: "normalization_failed", summary: (error as Error).message };
      await this.persistArtifact(ctx, updated);
      await this.persistNormalization(ctx, failed, artifact.runId, artifact.taskId);
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "sandbox_artifact_normalization_failed", targetType: "sandbox_artifact", targetId: artifact.id, outcome: "failure", metadata: (error as Error).message });
      return { artifact: updated, normalization: failed };
    }
  }

  async listByRun(ctx: AppContext, runId: string): Promise<SandboxArtifactSummary[]> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, runId, type: "validation_lesson" });
    return rows.filter((row) => row.tags.includes("sandbox_artifact")).map((row) => {
      const a = JSON.parse(row.detail ?? "{}") as SandboxArtifact;
      return { artifactId: a.id, type: a.type, status: a.status, summary: a.summary, normalized: a.normalized, generatedAt: a.createdAt, sourceTaskId: a.taskId, sourceRunId: a.runId };
    });
  }

  async getPreview(ctx: AppContext, artifactId: string): Promise<ArtifactPreview> {
    const artifact = await this.getArtifact(ctx, artifactId);
    const content = artifact.normalizedContent ?? artifact.rawContent;
    const preview: ArtifactPreview = { artifactId: artifact.id, previewType: artifact.type.includes("json") ? "json" : artifact.type.includes("markdown") ? "markdown" : "text", content: content.slice(0, 6000), truncated: content.length > 6000, generatedAt: now() };
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "artifact_preview_opened", targetType: "sandbox_artifact", targetId: artifact.id, outcome: "success" });
    return preview;
  }

  async getOutputBundle(ctx: AppContext, sessionId: string): Promise<SandboxOutputBundle> {
    const artifacts = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "validation_lesson" });
    const norm = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "review_preference" });
    return { sessionId, artifactIds: artifacts.filter((row) => row.tags.includes(`session:${sessionId}`)).map((row) => row.title.replace("artifact:", "")), normalizationRecordIds: norm.filter((row) => row.tags.includes(`session:${sessionId}`)).map((row) => row.title.replace("normalization:", "")), generatedAt: now() };
  }

  async listNormalizationRecords(ctx: AppContext, runId: string) {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, runId, type: "review_preference" });
    return rows.filter((row) => row.tags.includes("artifact_normalization")).map((row) => JSON.parse(row.detail ?? "{}") as ArtifactNormalizationRecord);
  }

  private async getArtifact(ctx: AppContext, artifactId: string): Promise<SandboxArtifact> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "validation_lesson" });
    const row = rows.filter((entry) => entry.tags.includes("sandbox_artifact") && entry.title === `artifact:${artifactId}`).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!row) throw new Error("sandbox_artifact_not_found");
    return JSON.parse(row.detail ?? "{}") as SandboxArtifact;
  }

  private async persistArtifact(ctx: AppContext, artifact: SandboxArtifact) {
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, runId: artifact.runId, scope: "run", type: "validation_lesson", source: "run_artifact", confidence: "medium", status: "active", title: `artifact:${artifact.id}`, summary: `${artifact.type}:${artifact.status}`, detail: JSON.stringify(artifact), tags: ["sandbox_artifact", `run:${artifact.runId}`, `task:${artifact.taskId}`, `session:${artifact.sessionId}`], provenance: { createdBy: ctx.actorId }, createdAt: now(), updatedAt: now() });
  }

  private async persistNormalization(ctx: AppContext, record: ArtifactNormalizationRecord, runId: string, taskId: string) {
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, runId, scope: "run", type: "review_preference", source: "run_artifact", confidence: "medium", status: "active", title: `normalization:${record.id}`, summary: `${record.status}:${record.artifactId}`, detail: JSON.stringify(record), tags: ["artifact_normalization", `run:${runId}`, `task:${taskId}`, `session:${record.sessionId}`], provenance: { createdBy: ctx.actorId }, createdAt: now(), updatedAt: now() });
  }
}
