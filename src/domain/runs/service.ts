import crypto from "node:crypto";
import { createDesignService } from "@/domain/design/service";
import { cancelRun, completeStep, decideApproval, describeCurrentStep, RunError, startRun } from "@/domain/runs/engine";
import type { Actor, CurrentStep, WorkflowRun, WorkflowSnapshot } from "@/domain/runs/types";
import { createUsageService, type UsageReporter } from "@/domain/usage/service";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

export const RUN_KIND = "workflow_run";

export type RunSummary = Pick<WorkflowRun, "id" | "systemId" | "systemName" | "versionId" | "versionName" | "status" | "trigger" | "startedAt" | "endedAt" | "error" | "currentNodeId" | "startedBy"> & {
  stepCount: number;
  currentStepTitle?: string;
  /** For failed or canceled runs: the step the run stopped at. */
  stoppedAtTitle?: string;
  durationMs?: number;
};

export type RunEventListener = (event: { type: "run.started" | "run.completed" | "run.failed" | "run.canceled" | "approval.requested" | "step.completed"; run: WorkflowRun }) => Promise<void> | void;

export function summarize(run: WorkflowRun): RunSummary {
  const current = run.currentNodeId ? run.snapshot.nodes.find((n) => n.id === run.currentNodeId) : undefined;
  return {
    id: run.id,
    systemId: run.systemId,
    systemName: run.systemName,
    versionId: run.versionId,
    versionName: run.versionName,
    status: run.status,
    trigger: run.trigger,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    error: run.error,
    currentNodeId: run.currentNodeId,
    startedBy: run.startedBy,
    stepCount: run.steps.filter((s) => s.completedAt).length,
    currentStepTitle: current?.title,
    stoppedAtTitle: run.status === "failed" || run.status === "canceled" ? run.steps[run.steps.length - 1]?.nodeTitle : undefined,
    durationMs: run.endedAt ? new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime() : undefined
  };
}

function actorFor(ctx: AppContext, label?: string): Actor {
  return { type: ctx.actorType, id: ctx.actorId, label };
}

const ROLE_RANK: Record<string, number> = { Viewer: 0, Commenter: 1, Editor: 2, Admin: 3, Owner: 4 };

export function createRunService(repos: RepositorySet, options: { reporter?: UsageReporter; onEvent?: RunEventListener } = {}) {
  const design = createDesignService(repos);
  const usage = createUsageService(repos, options.reporter);
  const emit = async (type: Parameters<RunEventListener>[0]["type"], run: WorkflowRun) => {
    try {
      await options.onEvent?.({ type, run });
    } catch {
      // Listeners (webhooks) never break a run.
    }
  };

  async function save(run: WorkflowRun) {
    await repos.documents.put<WorkflowRun>({ kind: RUN_KIND, id: run.id, workspaceId: run.workspaceId, refId: run.systemId, data: run });
    return run;
  }

  async function load(ctx: Pick<AppContext, "workspaceId">, runId: string): Promise<WorkflowRun> {
    const doc = await repos.documents.get<WorkflowRun>(RUN_KIND, runId);
    if (!doc || doc.workspaceId !== ctx.workspaceId) throw new RunError("run_not_found", "Run not found.");
    return doc.data;
  }

  async function audit(ctx: AppContext, action: string, run: WorkflowRun, outcome: "success" | "failure" = "success", metadata?: Record<string, unknown>) {
    await repos.audits
      .add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action, targetType: "run", targetId: run.id, systemId: run.systemId, outcome, metadata: metadata ? JSON.stringify(metadata) : undefined })
      .catch(() => undefined);
  }

  async function afterTransition(ctx: AppContext, before: WorkflowRun, after: WorkflowRun) {
    if (after.status === "waiting_approval" && before.currentNodeId !== after.currentNodeId) await emit("approval.requested", after);
    if (after.status !== before.status) {
      if (after.status === "completed") await emit("run.completed", after);
      if (after.status === "failed") await emit("run.failed", after);
      if (after.status === "canceled") await emit("run.canceled", after);
    }
  }

  return {
    design,
    usage,

    /** The workflow as it stands now, frozen for a run. */
    async snapshot(systemId: string): Promise<{ snapshot: WorkflowSnapshot; systemName: string; workspaceId: string; versionId?: string; versionName?: string }> {
      const bundle = await repos.systems.getBundle(systemId);
      const spec = await design.get(systemId);
      const latest = [...(bundle.versions ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return {
        systemName: bundle.system.name,
        workspaceId: bundle.system.workspaceId,
        versionId: latest?.id,
        versionName: latest?.name,
        snapshot: {
          nodes: bundle.nodes.map((n) => ({ id: n.id, type: n.type, title: n.title, description: n.description })),
          pipes: bundle.pipes.filter((p) => p.fromNodeId && p.toNodeId).map((p) => ({ id: p.id, fromNodeId: String(p.fromNodeId), toNodeId: String(p.toNodeId) })),
          steps: spec.steps,
          routes: spec.routes
        }
      };
    },

    async start(ctx: AppContext, input: { systemId: string; trigger: WorkflowRun["trigger"]; input?: unknown; startNodeId?: string; actorLabel?: string }): Promise<WorkflowRun> {
      const frozen = await this.snapshot(input.systemId);
      if (frozen.workspaceId !== ctx.workspaceId) throw new RunError("system_not_found", "System not found.");
      const quota = await usage.canStartRun(ctx.workspaceId, ctx.plan);
      if (!quota.allowed) throw new RunError("quota_exceeded", quota.reason ?? "Run quota reached.");
      const run = startRun({
        id: `run_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        systemId: input.systemId,
        workspaceId: ctx.workspaceId,
        systemName: frozen.systemName,
        snapshot: frozen.snapshot,
        startedBy: actorFor(ctx, input.actorLabel),
        trigger: input.trigger,
        input: input.input,
        versionId: frozen.versionId,
        versionName: frozen.versionName,
        startNodeId: input.startNodeId
      });
      await save(run);
      await usage.record(ctx.workspaceId, "run_started", { systemId: run.systemId, runId: run.id, actorType: ctx.actorType });
      await audit(ctx, "run.start", run, "success", { trigger: input.trigger });
      await emit("run.started", run);
      if (run.status === "waiting_approval") await emit("approval.requested", run);
      return run;
    },

    get: (ctx: Pick<AppContext, "workspaceId">, runId: string) => load(ctx, runId),

    async current(ctx: Pick<AppContext, "workspaceId">, runId: string): Promise<CurrentStep> {
      return describeCurrentStep(await load(ctx, runId));
    },

    async complete(ctx: AppContext, runId: string, input: { nodeId?: string; outcome?: string; output?: unknown; notes?: string; next?: string; actorLabel?: string }): Promise<WorkflowRun> {
      const before = await load(ctx, runId);
      const after = completeStep(before, { ...input, performedBy: actorFor(ctx, input.actorLabel) });
      await save(after);
      await usage.record(ctx.workspaceId, "step_completed", { systemId: after.systemId, runId: after.id, actorType: ctx.actorType });
      await audit(ctx, "run.step.complete", after, "success", { nodeId: before.currentNodeId, outcome: input.outcome ?? "success" });
      await emit("step.completed", after);
      await afterTransition(ctx, before, after);
      return after;
    },

    async decide(ctx: AppContext, runId: string, input: { decision: "approved" | "rejected" | "sent_back"; comment?: string; sendBackTo?: string; actorLabel?: string }): Promise<WorkflowRun> {
      const before = await load(ctx, runId);
      const required = before.currentNodeId ? before.snapshot.steps[before.currentNodeId]?.approverRole ?? "Editor" : "Editor";
      if (ctx.actorType !== "user" || (ROLE_RANK[ctx.role] ?? 0) < ROLE_RANK[required]) {
        throw new RunError("not_allowed", `Only a person with the ${required} role or higher can decide this approval.`);
      }
      const after = decideApproval(before, { decision: input.decision, comment: input.comment, sendBackTo: input.sendBackTo, by: actorFor(ctx, input.actorLabel) });
      await save(after);
      await audit(ctx, `run.approval.${input.decision}`, after, "success", { nodeId: before.currentNodeId });
      await afterTransition(ctx, before, after);
      return after;
    },

    async cancel(ctx: AppContext, runId: string, reason?: string): Promise<WorkflowRun> {
      const before = await load(ctx, runId);
      const after = cancelRun(before, reason);
      await save(after);
      await audit(ctx, "run.cancel", after);
      await afterTransition(ctx, before, after);
      return after;
    },

    async listForSystem(ctx: Pick<AppContext, "workspaceId">, systemId: string): Promise<RunSummary[]> {
      const docs = await repos.documents.list<WorkflowRun>(RUN_KIND, { refId: systemId });
      return docs
        .filter((d) => d.workspaceId === ctx.workspaceId)
        .map((d) => summarize(d.data))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },

    async listForWorkspace(ctx: Pick<AppContext, "workspaceId">, filter: { status?: WorkflowRun["status"] } = {}): Promise<RunSummary[]> {
      const docs = await repos.documents.list<WorkflowRun>(RUN_KIND, { workspaceId: ctx.workspaceId });
      return docs
        .map((d) => summarize(d.data))
        .filter((r) => !filter.status || r.status === filter.status)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },

    /** How many runs match, without summarizing or sorting them: the nav badge only needs the number. */
    async countForWorkspace(ctx: Pick<AppContext, "workspaceId">, filter: { status?: WorkflowRun["status"] } = {}): Promise<number> {
      const docs = await repos.documents.list<WorkflowRun>(RUN_KIND, { workspaceId: ctx.workspaceId });
      return filter.status ? docs.filter((d) => d.data.status === filter.status).length : docs.length;
    }
  };
}

export type RunService = ReturnType<typeof createRunService>;
