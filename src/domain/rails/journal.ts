/**
 * The run journal: one event per change to a run, written in the same
 * transaction as the run itself (see DocumentsRepository.commit). Because the
 * engine is pure and takes the clock as an input, `replay` folds a run's
 * events back through it and rebuilds the run exactly. That is how Pipes can
 * show what an agent was shown, rebuild a run after a bad write, and test an
 * engine change against real recorded runs.
 */
import { cancelRun, completeStep, decideApproval, startRun, timeoutStep, failRun } from "@/domain/runs/engine";
import type { Actor, WorkflowRun, WorkflowSnapshot } from "@/domain/runs/types";
import type { RunEvent, RunEventType } from "@/domain/rails/types";

export const RUN_EVENT_KIND = "run_event";

export const eventId = (runId: string, seq: number) => `${runId}:${String(seq).padStart(6, "0")}`;

export function makeEvent(run: WorkflowRun, seq: number, type: RunEventType, actor: Actor, at: string, data: Record<string, unknown>, idempotencyKey?: string): RunEvent {
  return { runId: run.id, seq, at, actor, type, data, idempotencyKey };
}

/** What `startRun` needs that is not in the snapshot, recorded on the first event. */
export type StartData = {
  systemId: string;
  workspaceId: string;
  systemName: string;
  trigger: WorkflowRun["trigger"];
  input?: unknown;
  versionId?: string;
  versionName?: string;
  startNodeId: string;
};

/** Rebuild a run from its snapshot and journal. Denials are no-ops: they never changed the run. */
export function replay(snapshot: WorkflowSnapshot, events: RunEvent[]): WorkflowRun | null {
  let run: WorkflowRun | null = null;
  for (const event of [...events].sort((a, b) => a.seq - b.seq)) {
    const d = event.data;
    switch (event.type) {
      case "run.started": {
        const start = d as unknown as StartData;
        run = startRun({ id: event.runId, snapshot, startedBy: event.actor, at: event.at, ...start });
        break;
      }
      case "step.completed":
        if (run) run = completeStep(run, { nodeId: d.nodeId as string, outcome: d.outcome as string, output: d.output, notes: d.notes as string, next: d.next as string, costMicros: d.costMicros as number, idempotencyKey: event.idempotencyKey, performedBy: event.actor, at: event.at });
        break;
      case "approval.decided":
        if (run) run = decideApproval(run, { decision: d.decision as "approved", comment: d.comment as string, sendBackTo: d.sendBackTo as string, by: event.actor, at: event.at });
        break;
      case "step.timed_out":
        if (run) run = timeoutStep(run, { at: event.at, failRunInstead: Boolean(d.failRunInstead) });
        break;
      case "run.deadline_exceeded":
        if (run) run = failRun(run, { code: "deadline_exceeded", message: "This run passed its deadline.", at: event.at, endReason: "deadline" });
        break;
      case "run.finished":
        if (run && d.code) run = failRun(run, { code: String(d.code), message: String(d.message ?? ""), at: event.at });
        break;
      case "run.canceled":
        if (run) run = cancelRun(run, d.reason as string, event.at);
        break;
      default:
        break;
    }
    if (run) run = { ...run, rev: event.seq };
  }
  return run;
}
