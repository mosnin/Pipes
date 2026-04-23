import { createHash } from "node:crypto";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { FileBundleRef, SandboxSession, WorkspaceMountRef } from "@/domain/runtime/sandbox";

const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export class SandboxSessionService {
  constructor(private readonly repos: RepositorySet) {}

  async prepareInputBundle(ctx: AppContext, input: { runId: string; taskId: string; bundleType: FileBundleRef["bundleType"]; content: string }) {
    const checksum = createHash("sha256").update(input.content).digest("hex");
    const bundle: FileBundleRef = { id: id("fbr"), workspaceId: ctx.workspaceId, runId: input.runId, taskId: input.taskId, bundleType: input.bundleType, fileCount: 1, checksum, createdAt: now() };
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, runId: input.runId, scope: "run", type: "plan_memory", source: "run_artifact", confidence: "medium", status: "active", title: `file_bundle:${bundle.id}`, summary: `${bundle.bundleType}:${bundle.fileCount}`, detail: JSON.stringify(bundle), tags: ["sandbox_file_bundle", `run:${input.runId}`, `task:${input.taskId}`], provenance: { createdBy: ctx.actorId }, createdAt: now(), updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "file_bundle_prepared", targetType: "sandbox_file_bundle", targetId: bundle.id, outcome: "success" });
    return bundle;
  }

  async requestWorkspaceMount(ctx: AppContext, input: { workspaceId?: string; mountType: WorkspaceMountRef["mountType"]; pathHint: string }) {
    const mount: WorkspaceMountRef = { id: id("wmr"), workspaceId: input.workspaceId ?? ctx.workspaceId, mountType: input.mountType, pathHint: input.pathHint, createdAt: now() };
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, scope: "workspace", type: "decision_memory", source: "user_saved", confidence: "medium", status: "active", title: `workspace_mount:${mount.id}`, summary: `${mount.mountType}:${mount.pathHint}`, detail: JSON.stringify(mount), tags: ["workspace_mount_ref"], provenance: { createdBy: ctx.actorId }, createdAt: now(), updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "workspace_mount_requested", targetType: "workspace_mount", targetId: mount.id, outcome: "success" });
    return mount;
  }

  async createSession(ctx: AppContext, input: { runId: string; taskId: string; executionTarget: "modal_worker" | "modal_sandbox"; mountRefs?: WorkspaceMountRef[]; fileBundleRef?: FileBundleRef; resumeFromSessionId?: string }): Promise<SandboxSession> {
    const session: SandboxSession = {
      id: id("ssn"),
      workspaceId: ctx.workspaceId,
      runId: input.runId,
      taskId: input.taskId,
      status: "created",
      executionTarget: input.executionTarget,
      mountRefs: input.mountRefs ?? [],
      fileBundleRef: input.fileBundleRef,
      resumeToken: input.resumeFromSessionId ? `resume:${input.resumeFromSessionId}` : undefined,
      createdAt: now(),
      updatedAt: now()
    };
    await this.persistSession(ctx, session);
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: input.resumeFromSessionId ? "sandbox_session_resumed" : "sandbox_session_created", targetType: "sandbox_session", targetId: session.id, outcome: "success" });
    return session;
  }

  async updateStatus(ctx: AppContext, input: { sessionId: string; status: SandboxSession["status"]; note?: string }) {
    const session = await this.getSession(ctx, input.sessionId);
    const updated = { ...session, status: input.status, updatedAt: now() };
    await this.persistSession(ctx, updated);
    return updated;
  }

  async listSessions(ctx: AppContext, runId: string): Promise<SandboxSession[]> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, runId, type: "plan_memory" });
    return rows.filter((row) => row.tags.includes("sandbox_session")).map((row) => JSON.parse(row.detail ?? "{}") as SandboxSession).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getSession(ctx: AppContext, sessionId: string): Promise<SandboxSession> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "plan_memory" });
    const row = rows.filter((entry) => entry.tags.includes("sandbox_session") && entry.title === sessionId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!row) throw new Error("sandbox_session_not_found");
    return JSON.parse(row.detail ?? "{}") as SandboxSession;
  }

  private async persistSession(ctx: AppContext, session: SandboxSession) {
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, runId: session.runId, scope: "run", type: "plan_memory", source: "run_artifact", confidence: "medium", status: "active", title: session.id, summary: `${session.executionTarget}:${session.status}`, detail: JSON.stringify(session), tags: ["sandbox_session", `run:${session.runId}`, `task:${session.taskId}`], provenance: { createdBy: ctx.actorId }, createdAt: now(), updatedAt: now() });
  }
}
