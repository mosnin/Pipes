import crypto from "node:crypto";
import { createDesignService } from "@/domain/design/service";
import { enforceStepBudget, expire, gateComplete, gateStart } from "@/domain/rails/gate";
import { eventId, makeEvent, RUN_EVENT_KIND, type StartData } from "@/domain/rails/journal";
import { createSwitchService } from "@/domain/rails/switches";
import type { RunEvent } from "@/domain/rails/types";
import { cancelRun, completeStep, decideApproval, describeCurrentStep, findStartNode, isTerminal, RunError, startRun } from "@/domain/runs/engine";
import type { Actor, CurrentStep, WorkflowRun, WorkflowSnapshot } from "@/domain/runs/types";
import { createUsageService, type UsageReporter } from "@/domain/usage/service";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

export const RUN_KIND = "workflow_run";
export const RUN_START_KEY_KIND = "run_start_key";

/** How many times a write re-reads and retries when another write moved the run first. */
const COMMIT_ATTEMPTS = 4;

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

  const switches = createSwitchService(repos);

  async function read(ctx: Pick<AppContext, "workspaceId">, runId: string): Promise<WorkflowRun> {
    const doc = await repos.documents.get<WorkflowRun>(RUN_KIND, runId);
    if (!doc || doc.workspaceId !== ctx.workspaceId) throw new RunError("run_not_found", "Run not found.");
    return { ...doc.data, rev: doc.data.rev ?? 0 };
  }

  /**
   * Save a run change and its journal events in one conditional commit. Lands
   * only if the run's rev is still `before.rev`; returns false when another
   * write got there first, so the caller re-reads and decides again.
   */
  async function commitRun(before: WorkflowRun | null, after: WorkflowRun, events: Array<Omit<RunEvent, "seq" | "runId">>, extra: Parameters<typeof repos.documents.commit>[0]["inserts"] = []) {
    const baseRev = before ? (before.rev ?? 0) : -1;
    const startSeq = Math.max(baseRev, 0);
    const journal = events.map((e, i) => ({ ...e, runId: after.id, seq: startSeq + i + 1 }) as RunEvent);
    const saved: WorkflowRun = { ...after, rev: startSeq + journal.length };
    const res = await repos.documents.commit<WorkflowRun>({
      put: { kind: RUN_KIND, id: saved.id, workspaceId: saved.workspaceId, refId: saved.systemId, data: saved, expectedRev: baseRev },
      inserts: [...journal.map((e) => ({ kind: RUN_EVENT_KIND, id: eventId(saved.id, e.seq), workspaceId: saved.workspaceId, refId: saved.id, data: e })), ...(extra ?? [])]
    });
    return res.ok ? saved : null;
  }

  /** Load a run, applying any time-based rail that has come due (deadline, step timeout) first. */
  async function load(ctx: Pick<AppContext, "workspaceId">, runId: string): Promise<WorkflowRun> {
    for (let attempt = 0; attempt < COMMIT_ATTEMPTS; attempt++) {
      const run = await read(ctx, runId);
      const now = new Date().toISOString();
      const due = expire(run, now);
      if (!due.reason) return run;
      const system: Actor = { type: "trigger", id: "rails", label: "Pipes rails" };
      const record = run.steps[run.steps.length - 1];
      const event =
        due.reason === "deadline"
          ? { type: "run.deadline_exceeded" as const, at: run.deadlineAt ?? now, actor: system, data: {} }
          : { type: "step.timed_out" as const, at: due.run.steps.find((s) => s.index === record?.index)?.completedAt ?? now, actor: system, data: { nodeId: record?.nodeId, failRunInstead: run.snapshot.steps[record?.nodeId ?? ""]?.rails?.onTimeout === "fail_run" } };
      const saved = await commitRun(run, due.run, [event]);
      if (saved) {
        await afterTransition({ workspaceId: run.workspaceId, actorType: "agent", actorId: "rails" } as AppContext, run, saved);
        return saved;
      }
    }
    return read(ctx, runId);
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
          routes: spec.routes,
          rails: spec.rails
        }
      };
    },

    async start(ctx: AppContext, input: { systemId: string; trigger: WorkflowRun["trigger"]; input?: unknown; startNodeId?: string; actorLabel?: string; idempotencyKey?: string }): Promise<WorkflowRun> {
      const key = input.idempotencyKey?.trim().slice(0, 200);
      const keyId = key ? `${ctx.workspaceId}:${key}` : undefined;
      if (keyId) {
        const seen = await repos.documents.get<{ runId: string }>(RUN_START_KEY_KIND, keyId);
        if (seen && seen.workspaceId === ctx.workspaceId) return load(ctx, seen.data.runId);
      }
      const frozen = await this.snapshot(input.systemId);
      if (frozen.workspaceId !== ctx.workspaceId) throw new RunError("system_not_found", "System not found.");
      const live = await switches.forWorkflow(ctx.workspaceId, input.systemId);
      const active = (await repos.documents.list<WorkflowRun>(RUN_KIND, { refId: input.systemId })).filter((d) => d.workspaceId === ctx.workspaceId && !isTerminal(d.data)).length;
      const gate = gateStart({ systemId: input.systemId, snapshot: frozen.snapshot, switches: live, activeRuns: active });
      if (!gate.allow) throw new RunError(gate.code, gate.message);
      const quota = await usage.canStartRun(ctx.workspaceId, ctx.plan);
      if (!quota.allowed) throw new RunError("quota_exceeded", quota.reason ?? "Run quota reached.");
      const at = new Date().toISOString();
      const startedBy = actorFor(ctx, input.actorLabel);
      const start: StartData = {
        systemId: input.systemId,
        workspaceId: ctx.workspaceId,
        systemName: frozen.systemName,
        trigger: input.trigger,
        input: input.input,
        versionId: frozen.versionId,
        versionName: frozen.versionName,
        startNodeId: findStartNode(frozen.snapshot, input.startNodeId)
      };
      const run = startRun({ id: `run_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, snapshot: frozen.snapshot, startedBy, at, ...start });
      const startedEvent = { type: "run.started" as const, at, actor: startedBy, idempotencyKey: key, data: start as unknown as Record<string, unknown> };
      let saved: WorkflowRun | null;
      if (keyId) {
        // The key document is the commit target: if another start with this key landed first, ours writes nothing.
        const journal: RunEvent = { ...startedEvent, runId: run.id, seq: 1 };
        const res = await repos.documents.commit({
          put: { kind: RUN_START_KEY_KIND, id: keyId, workspaceId: ctx.workspaceId, refId: input.systemId, data: { runId: run.id }, expectedRev: -1 },
          inserts: [
            { kind: RUN_KIND, id: run.id, workspaceId: ctx.workspaceId, refId: run.systemId, data: { ...run, rev: 1 } },
            { kind: RUN_EVENT_KIND, id: eventId(run.id, 1), workspaceId: ctx.workspaceId, refId: run.id, data: journal }
          ]
        });
        if (!res.ok) {
          const seen = await repos.documents.get<{ runId: string }>(RUN_START_KEY_KIND, keyId);
          if (seen) return load(ctx, seen.data.runId);
          throw new RunError("conflict", "Another start with this key is in progress. Try again.");
        }
        saved = { ...run, rev: 1 };
      } else {
        saved = await commitRun(null, run, [startedEvent]);
        if (!saved) throw new RunError("conflict", "That run id is already taken. Try again.");
      }
      await usage.record(ctx.workspaceId, "run_started", { systemId: saved.systemId, runId: saved.id, actorType: ctx.actorType, id: `start_${saved.id}` });
      await audit(ctx, "run.start", saved, "success", { trigger: input.trigger });
      await emit("run.started", saved);
      if (saved.status === "waiting_approval") await emit("approval.requested", saved);
      return saved;
    },

    get: (ctx: Pick<AppContext, "workspaceId">, runId: string) => load(ctx, runId),

    async current(ctx: Pick<AppContext, "workspaceId">, runId: string): Promise<CurrentStep> {
      return describeCurrentStep(await load(ctx, runId));
    },

    async complete(ctx: AppContext, runId: string, input: { nodeId?: string; outcome?: string; output?: unknown; notes?: string; next?: string; actorLabel?: string; idempotencyKey?: string; costMicros?: number }): Promise<WorkflowRun> {
      const key = input.idempotencyKey?.trim().slice(0, 200) || undefined;
      for (let attempt = 0; attempt < COMMIT_ATTEMPTS; attempt++) {
        const before = await load(ctx, runId);
        // A retry of a completion that already landed gets the run as it is now, not a second step.
        if (key && before.steps.some((s) => s.idempotencyKey === key)) return before;
        const live = await switches.forWorkflow(ctx.workspaceId, before.systemId);
        const gate = gateComplete(before, { outcome: input.outcome, output: input.output, costMicros: input.costMicros }, live);
        if (!gate.allow) {
          await audit(ctx, "rail.denied", before, "failure", { code: gate.code, nodeId: before.currentNodeId });
          throw new RunError(gate.code, gate.message);
        }
        const at = new Date().toISOString();
        const performedBy = actorFor(ctx, input.actorLabel);
        const payload = { ...input, outcome: gate.value.outcome, performedBy, at, idempotencyKey: key };
        let after = completeStep(before, payload);
        const events: Array<Omit<RunEvent, "seq" | "runId">> = [
          { type: "step.completed", at, actor: performedBy, idempotencyKey: key, data: { nodeId: before.currentNodeId, outcome: gate.value.outcome, output: input.output, notes: input.notes, next: input.next, costMicros: input.costMicros } }
        ];
        const budgeted = enforceStepBudget(after, at);
        if (budgeted !== after) {
          after = budgeted;
          events.push({ type: "run.finished", at, actor: { type: "trigger", id: "rails", label: "Pipes rails" }, data: { code: after.errorCode, message: after.error } });
        }
        const saved = await commitRun(before, after, events);
        if (!saved) continue;
        await usage.record(ctx.workspaceId, "step_completed", { systemId: saved.systemId, runId: saved.id, actorType: ctx.actorType, id: `step_${saved.id}_${saved.rev}` });
        await audit(ctx, "run.step.complete", saved, "success", { nodeId: before.currentNodeId, outcome: gate.value.outcome ?? "success" });
        await emit("step.completed", saved);
        await afterTransition(ctx, before, saved);
        return saved;
      }
      throw new RunError("conflict", "This run changed while your step was being saved. Get the current step and try again.");
    },

    async decide(ctx: AppContext, runId: string, input: { decision: "approved" | "rejected" | "sent_back"; comment?: string; sendBackTo?: string; actorLabel?: string }): Promise<WorkflowRun> {
      for (let attempt = 0; attempt < COMMIT_ATTEMPTS; attempt++) {
        const before = await load(ctx, runId);
        const required = before.currentNodeId ? before.snapshot.steps[before.currentNodeId]?.approverRole ?? "Editor" : "Editor";
        if (ctx.actorType !== "user" || (ROLE_RANK[ctx.role] ?? 0) < ROLE_RANK[required]) {
          throw new RunError("not_allowed", `Only a person with the ${required} role or higher can decide this approval.`);
        }
        const at = new Date().toISOString();
        const by = actorFor(ctx, input.actorLabel);
        const after = decideApproval(before, { decision: input.decision, comment: input.comment, sendBackTo: input.sendBackTo, by, at });
        const saved = await commitRun(before, after, [{ type: "approval.decided", at, actor: by, data: { decision: input.decision, comment: input.comment, sendBackTo: input.sendBackTo } }]);
        if (!saved) continue;
        await audit(ctx, `run.approval.${input.decision}`, saved, "success", { nodeId: before.currentNodeId });
        await afterTransition(ctx, before, saved);
        return saved;
      }
      throw new RunError("conflict", "This approval changed while it was being saved. Reload and try again.");
    },

    async cancel(ctx: AppContext, runId: string, reason?: string): Promise<WorkflowRun> {
      for (let attempt = 0; attempt < COMMIT_ATTEMPTS; attempt++) {
        const before = await load(ctx, runId);
        const at = new Date().toISOString();
        const after = cancelRun(before, reason, at);
        const saved = await commitRun(before, after, [{ type: "run.canceled", at, actor: actorFor(ctx), data: { reason } }]);
        if (!saved) continue;
        await audit(ctx, "run.cancel", saved);
        await afterTransition(ctx, before, saved);
        return saved;
      }
      throw new RunError("conflict", "This run changed while it was being canceled. Try again.");
    },

    /** The run's journal, oldest first. */
    async events(ctx: Pick<AppContext, "workspaceId">, runId: string, afterSeq = 0): Promise<RunEvent[]> {
      await read(ctx, runId);
      const docs = await repos.documents.list<RunEvent>(RUN_EVENT_KIND, { refId: runId });
      return docs
        .filter((d) => d.workspaceId === ctx.workspaceId)
        .map((d) => d.data)
        .filter((e) => e.seq > afterSeq)
        .sort((a, b) => a.seq - b.seq);
    },

    /**
     * Stop runs now. "pause" refuses new runs and step completions; "halt" also
     * cancels every active run in scope. Owners and admins only (checked by the caller).
     */
    async setKillSwitch(ctx: AppContext, input: { scope: "workspace" | "workflow"; systemId?: string; mode: "off" | "pause" | "halt"; reason?: string }) {
      const value = await switches.set(ctx.workspaceId, { scope: input.scope, targetId: input.systemId ?? ctx.workspaceId, mode: input.mode, reason: input.reason, setBy: ctx.actorId });
      let canceled = 0;
      if (input.mode === "halt") {
        const docs = input.scope === "workflow" && input.systemId ? await repos.documents.list<WorkflowRun>(RUN_KIND, { refId: input.systemId }) : await repos.documents.list<WorkflowRun>(RUN_KIND, { workspaceId: ctx.workspaceId });
        for (const doc of docs.filter((d) => d.workspaceId === ctx.workspaceId && !isTerminal(d.data))) {
          await this.cancel(ctx, doc.data.id, `Halted${value.reason ? `: ${value.reason}` : " by the kill switch."}`).then(() => canceled++, () => undefined);
        }
      }
      await repos.audits
        .add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: `rails.kill_switch.${input.mode}`, targetType: input.scope, targetId: value.targetId, outcome: "success", metadata: JSON.stringify({ reason: value.reason, canceled }) })
        .catch(() => undefined);
      return { switch: value, canceled };
    },

    switches,

    /** Apply due time-based rails to every active run in a workspace (called by the rails cron). */
    async sweep(ctx: Pick<AppContext, "workspaceId">): Promise<number> {
      const docs = await repos.documents.list<WorkflowRun>(RUN_KIND, { workspaceId: ctx.workspaceId });
      let changed = 0;
      for (const doc of docs.filter((d) => !isTerminal(d.data))) {
        const now = new Date().toISOString();
        if (expire(doc.data, now).reason) {
          await load(ctx, doc.data.id).catch(() => undefined);
          changed++;
        }
      }
      return changed;
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
    }
  };
}

export type RunService = ReturnType<typeof createRunService>;
