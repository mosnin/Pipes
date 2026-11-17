/**
 * The gate: one pure function per action that decides, from the run, its
 * frozen rails and live facts, whether the action may happen. Nothing here
 * reads storage or the clock; the service gathers facts and commits.
 */
import { failRun, isTerminal, timeoutStep } from "@/domain/runs/engine";
import type { WorkflowRun, WorkflowSnapshot } from "@/domain/runs/types";
import type { KillSwitch, RailCode } from "@/domain/rails/types";
import { validateOutput } from "@/domain/rails/validate";

export type Denied = { allow: false; code: RailCode; message: string };
export type Allowed<T = undefined> = { allow: true } & (T extends undefined ? object : { value: T });

/** A switch that is on (pause or halt) for this workflow, the workflow's own first. */
export function activeSwitch(switches: KillSwitch[], systemId: string): KillSwitch | undefined {
  const on = switches.filter((s) => s.mode !== "off");
  return on.find((s) => s.scope === "workflow" && s.targetId === systemId) ?? on.find((s) => s.scope === "workspace");
}

function switchMessage(s: KillSwitch) {
  const where = s.scope === "workspace" ? "this workspace" : "this workflow";
  return `Runs are ${s.mode === "halt" ? "halted" : "paused"} for ${where}${s.reason ? `: ${s.reason}` : "."}${s.reason?.endsWith(".") || !s.reason ? "" : "."} Try again when an owner turns runs back on.`;
}

export function gateStart(input: { systemId: string; snapshot: WorkflowSnapshot; switches: KillSwitch[]; activeRuns: number }): Allowed | Denied {
  const off = activeSwitch(input.switches, input.systemId);
  if (off) return { allow: false, code: "kill_switch", message: switchMessage(off) };
  const max = input.snapshot.rails?.concurrency?.maxActiveRuns;
  if (max !== undefined && input.activeRuns >= max) {
    return { allow: false, code: "concurrency_limit", message: `This workflow already has ${input.activeRuns} active runs, its limit of ${max}. Wait for one to finish.` };
  }
  return { allow: true };
}

export type CompleteInput = { outcome?: string; output?: unknown; costMicros?: number };

/**
 * Checks a step completion against the rails. May rewrite the completion: an
 * output that breaks a "failure_route" contract is completed as a failure.
 */
export function gateComplete(run: WorkflowRun, input: CompleteInput, switches: KillSwitch[]): { allow: true; value: CompleteInput } | Denied {
  const off = activeSwitch(switches, run.systemId);
  if (off) return { allow: false, code: "kill_switch", message: switchMessage(off) };
  if (isTerminal(run) || !run.currentNodeId) return { allow: true, value: input }; // the engine explains it
  const spec = run.snapshot.steps[run.currentNodeId]?.rails;
  const budgets = run.snapshot.rails?.budgets;
  const outcome = input.outcome?.trim() || "success";

  if (spec?.allowedOutcomes?.length) {
    const allowed = spec.allowedOutcomes.map((o) => o.toLowerCase());
    if (!allowed.includes(outcome.toLowerCase())) {
      return { allow: false, code: "outcome_not_allowed", message: `"${outcome}" is not an allowed outcome for this step. Use one of: ${spec.allowedOutcomes.join(", ")}.` };
    }
  }

  const cost = input.costMicros && input.costMicros > 0 ? Math.round(input.costMicros) : 0;
  if (spec?.maxCostMicros !== undefined && cost > spec.maxCostMicros) {
    return { allow: false, code: "budget_cost", message: `This step reported ${cost} micro-dollars, over its limit of ${spec.maxCostMicros}.` };
  }
  if (budgets?.maxCostMicros !== undefined && (run.costMicros ?? 0) + cost > budgets.maxCostMicros) {
    return { allow: false, code: "budget_cost", message: `This run would spend ${(run.costMicros ?? 0) + cost} micro-dollars, over its limit of ${budgets.maxCostMicros}.` };
  }

  let value = input;
  if (spec?.output && !["failure", "failed", "error"].includes(outcome.toLowerCase())) {
    const problems = validateOutput(spec.output.schema, input.output);
    if (problems.length) {
      if (spec.output.onInvalid === "reject") {
        return { allow: false, code: "invalid_output", message: `The output does not fit this step's contract. Fix it and complete the step again: ${problems.slice(0, 8).join("; ")}.` };
      }
      value = { ...input, outcome: "failure" };
    }
  }
  return { allow: true, value };
}

/** After a completion: did the run go over its step budget? Then it fails instead. */
export function enforceStepBudget(run: WorkflowRun, at: string): WorkflowRun {
  const max = run.snapshot.rails?.budgets?.maxSteps;
  if (max === undefined || isTerminal(run)) return run;
  const done = run.steps.filter((s) => s.completedAt).length;
  if (done < max) return run;
  return failRun(run, { code: "budget_steps", message: `This run reached its limit of ${max} steps.`, at });
}

/**
 * Time-based rails, applied whenever a run is loaded (Pipes has no background
 * worker; a cron pass catches runs nobody touches). Past the deadline the run
 * fails; past a step's timeout the step times out. Returns the run unchanged
 * when nothing is due.
 */
export function expire(run: WorkflowRun, now: string): { run: WorkflowRun; reason?: "deadline" | "step_timeout" } {
  if (isTerminal(run)) return { run };
  if (run.deadlineAt && now > run.deadlineAt) {
    return { run: failRun(run, { code: "deadline_exceeded", message: "This run passed its deadline.", at: run.deadlineAt, endReason: "deadline" }), reason: "deadline" };
  }
  const record = run.steps[run.steps.length - 1];
  const spec = run.currentNodeId ? run.snapshot.steps[run.currentNodeId]?.rails : undefined;
  if (record && !record.completedAt && spec?.timeoutMs && run.status === "running") {
    const due = new Date(new Date(record.startedAt).getTime() + spec.timeoutMs).toISOString();
    if (now > due) return { run: timeoutStep(run, { at: due, failRunInstead: spec.onTimeout === "fail_run" }), reason: "step_timeout" };
  }
  return { run };
}
