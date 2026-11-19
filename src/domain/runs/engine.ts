import type { Actor, CurrentStep, NextOption, RouteKind, StepRecord, WorkflowRun, WorkflowSnapshot } from "@/domain/runs/types";

/** Node types that never take part in a run. */
const NON_FLOW_TYPES = new Set(["Annotation", "Reference"]);
/** Node types a run may start from, in order of preference. */
const ENTRY_TYPES = ["Trigger", "Schedule", "Input"];
export const DEFAULT_MAX_ITERATIONS = 5;

export class RunError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

const nowIso = () => new Date().toISOString();

function flowNodes(snapshot: WorkflowSnapshot) {
  return snapshot.nodes.filter((n) => !NON_FLOW_TYPES.has(n.type));
}

function node(snapshot: WorkflowSnapshot, nodeId: string) {
  const found = snapshot.nodes.find((n) => n.id === nodeId);
  if (!found) throw new RunError("node_missing", `Step ${nodeId} is not part of this workflow.`);
  return found;
}

function routeKind(snapshot: WorkflowSnapshot, pipeId: string): RouteKind {
  return snapshot.routes[pipeId]?.routeKind ?? "default";
}

function routeLabel(snapshot: WorkflowSnapshot, pipeId: string): string | undefined {
  const route = snapshot.routes[pipeId];
  return route?.label || route?.conditionLabel || undefined;
}

export function outgoingOptions(snapshot: WorkflowSnapshot, nodeId: string): NextOption[] {
  return snapshot.pipes
    .filter((p) => p.fromNodeId === nodeId)
    .map((p) => {
      const target = snapshot.nodes.find((n) => n.id === p.toNodeId);
      return { pipeId: p.id, toNodeId: p.toNodeId, toNodeTitle: target?.title ?? p.toNodeId, routeKind: routeKind(snapshot, p.id), label: routeLabel(snapshot, p.id) };
    })
    .filter((o) => !NON_FLOW_TYPES.has(snapshot.nodes.find((n) => n.id === o.toNodeId)?.type ?? ""));
}

/** Where a run begins: an entry-type node with nothing flowing into it, else any node with nothing flowing into it. */
export function findStartNode(snapshot: WorkflowSnapshot, preferredNodeId?: string): string {
  const nodes = flowNodes(snapshot);
  if (nodes.length === 0) throw new RunError("empty_workflow", "This workflow has no steps yet. Add a step before starting a run.");
  if (preferredNodeId) {
    if (!nodes.some((n) => n.id === preferredNodeId)) throw new RunError("node_missing", `Step ${preferredNodeId} is not part of this workflow.`);
    return preferredNodeId;
  }
  const hasIncoming = new Set(snapshot.pipes.map((p) => p.toNodeId));
  for (const type of ENTRY_TYPES) {
    const entry = nodes.find((n) => n.type === type && !hasIncoming.has(n.id));
    if (entry) return entry.id;
  }
  const root = nodes.find((n) => !hasIncoming.has(n.id));
  return (root ?? nodes[0]).id;
}

function enterNode(run: WorkflowRun, nodeId: string, at: string): WorkflowRun {
  const target = node(run.snapshot, nodeId);
  const iterations = { ...run.iterations, [nodeId]: (run.iterations[nodeId] ?? 0) + 1 };
  const step: StepRecord = { index: run.steps.length, nodeId, nodeTitle: target.title, nodeType: target.type, startedAt: at };
  return {
    ...run,
    currentNodeId: nodeId,
    iterations,
    steps: [...run.steps, step],
    status: target.type === "HumanApproval" ? "waiting_approval" : "running"
  };
}

export function startRun(input: {
  /** The clock, passed in so a journal can replay the run exactly. Defaults to now. */
  at?: string;
  id: string;
  systemId: string;
  workspaceId: string;
  systemName: string;
  snapshot: WorkflowSnapshot;
  startedBy: Actor;
  trigger: WorkflowRun["trigger"];
  input?: unknown;
  versionId?: string;
  versionName?: string;
  startNodeId?: string;
}): WorkflowRun {
  const at = input.at ?? nowIso();
  const startNodeId = findStartNode(input.snapshot, input.startNodeId);
  const maxDurationMs = input.snapshot.rails?.budgets?.maxDurationMs;
  const base: WorkflowRun = {
    id: input.id,
    systemId: input.systemId,
    workspaceId: input.workspaceId,
    systemName: input.systemName,
    versionId: input.versionId,
    versionName: input.versionName,
    status: "running",
    input: input.input,
    steps: [],
    iterations: {},
    startedBy: input.startedBy,
    trigger: input.trigger,
    startedAt: at,
    snapshot: input.snapshot,
    rev: 0,
    deadlineAt: maxDurationMs ? new Date(new Date(at).getTime() + maxDurationMs).toISOString() : undefined
  };
  return enterNode(base, startNodeId, at);
}

function currentRecord(run: WorkflowRun): StepRecord {
  const record = run.steps[run.steps.length - 1];
  if (!record || record.nodeId !== run.currentNodeId) throw new RunError("no_current_step", "This run has no step in progress.");
  return record;
}

export function isTerminal(run: WorkflowRun) {
  return run.status === "completed" || run.status === "failed" || run.status === "canceled";
}

function normalize(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Choose the route out of a step.
 * 1. An explicit `next` (pipe id or target node id) wins, if it is a real route.
 * 2. Otherwise match the outcome: a route whose label matches it; then failure
 *    routes for "failure"; then success/default routes.
 * 3. Loop routes are only taken while the loop is under its iteration limit.
 * Returns null when the step has nowhere to go (the run ends).
 */
export function chooseRoute(run: WorkflowRun, nodeId: string, outcome: string, next?: string): NextOption | null {
  const options = outgoingOptions(run.snapshot, nodeId);
  if (options.length === 0) return null;
  const spec = run.snapshot.steps[nodeId];
  const limit = spec?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const loopAllowed = (option: NextOption) => option.routeKind !== "loop" || (run.iterations[option.toNodeId] ?? 0) < limit;

  if (next) {
    const picked = options.find((o) => o.pipeId === next || o.toNodeId === next);
    if (!picked) throw new RunError("invalid_next", `"${next}" is not a route out of this step. Choose one of: ${options.map((o) => o.pipeId).join(", ")}.`);
    if (!loopAllowed(picked)) {
      const exit = options.find((o) => o.routeKind !== "loop");
      if (exit) return exit;
      throw new RunError("loop_limit", `This loop has run ${limit} times, its limit. There is no exit route to take.`);
    }
    return picked;
  }

  const wanted = normalize(outcome);
  const usable = options.filter(loopAllowed);
  const byLabel = usable.find((o) => normalize(o.label) === wanted && wanted !== "");
  if (byLabel) return byLabel;

  if (wanted === "failure" || wanted === "failed" || wanted === "error") {
    const failure = usable.find((o) => o.routeKind === "failure");
    if (failure) return failure;
    return null; // a failure with no failure route ends the run as failed
  }
  if (wanted === "retry" || wanted === "loop" || wanted === "again") {
    const loop = usable.find((o) => o.routeKind === "loop");
    if (loop) return loop;
  }
  const preferred =
    usable.find((o) => o.routeKind === "success") ??
    usable.find((o) => o.routeKind === "default") ??
    usable.find((o) => o.routeKind !== "failure" && o.routeKind !== "loop" && o.routeKind !== "conditional");
  if (preferred) return preferred;

  const unlabeledConditionals = usable.filter((o) => o.routeKind === "conditional");
  if (unlabeledConditionals.length === 1) return unlabeledConditionals[0];
  if (usable.length === 1) return usable[0];
  throw new RunError(
    "choose_route",
    `This step has ${usable.length} possible routes. Pass "next" with one of: ${usable.map((o) => `${o.pipeId} (${o.label ?? o.routeKind} to ${o.toNodeTitle})`).join(", ")}.`
  );
}

function finish(run: WorkflowRun, status: "completed" | "failed", at: string, error?: string, errorCode?: string): WorkflowRun {
  return { ...run, status, currentNodeId: undefined, endedAt: at, error, errorCode };
}

/** End a run as failed because a rail stopped it (deadline, budget). The open step is closed with the reason. */
export function failRun(run: WorkflowRun, input: { code: string; message: string; at?: string; endReason?: StepRecord["endReason"] }): WorkflowRun {
  if (isTerminal(run)) return run;
  const at = input.at ?? nowIso();
  const last = run.steps[run.steps.length - 1];
  const steps = last && !last.completedAt ? [...run.steps.slice(0, -1), { ...last, completedAt: at, outcome: "failure", endReason: input.endReason, notes: input.message }] : run.steps;
  return finish({ ...run, steps }, "failed", at, input.message, input.code);
}

/**
 * The current step ran out of time. It takes its failure route when it has
 * one (unless the step says to fail the run); otherwise the run fails.
 */
export function timeoutStep(run: WorkflowRun, input: { at?: string; failRunInstead?: boolean }): WorkflowRun {
  if (isTerminal(run) || run.status === "waiting_approval") return run;
  const at = input.at ?? nowIso();
  const record = currentRecord(run);
  const message = `${record.nodeTitle} ran out of time.`;
  const failure = input.failRunInstead ? undefined : outgoingOptions(run.snapshot, record.nodeId).find((o) => o.routeKind === "failure");
  if (!failure) return failRun(run, { code: "step_timeout", message, at, endReason: "timeout" });
  const closed: StepRecord = { ...record, completedAt: at, outcome: "failure", endReason: "timeout", notes: message, pipeId: failure.pipeId };
  return enterNode({ ...run, steps: [...run.steps.slice(0, -1), closed] }, failure.toNodeId, at);
}

export function completeStep(
  run: WorkflowRun,
  input: { nodeId?: string; outcome?: string; output?: unknown; notes?: string; next?: string; performedBy: Actor; at?: string; costMicros?: number; idempotencyKey?: string }
): WorkflowRun {
  if (isTerminal(run)) throw new RunError("run_finished", `This run is already ${run.status}.`);
  if (run.status === "waiting_approval") throw new RunError("awaiting_approval", "This step is waiting for a person to approve it.");
  const record = currentRecord(run);
  if (input.nodeId && input.nodeId !== record.nodeId) {
    throw new RunError("stale_step", `The current step is ${record.nodeId} (${record.nodeTitle}), not ${input.nodeId}.`);
  }
  const at = input.at ?? nowIso();
  const outcome = input.outcome?.trim() || "success";
  const route = chooseRoute(run, record.nodeId, outcome, input.next);
  const cost = input.costMicros && input.costMicros > 0 ? Math.round(input.costMicros) : undefined;
  const completed: StepRecord = {
    ...record,
    completedAt: at,
    outcome,
    output: input.output,
    notes: input.notes,
    performedBy: input.performedBy,
    pipeId: route?.pipeId,
    costMicros: cost,
    idempotencyKey: input.idempotencyKey
  };
  const withRecord: WorkflowRun = { ...run, steps: [...run.steps.slice(0, -1), completed], costMicros: cost ? (run.costMicros ?? 0) + cost : run.costMicros };

  if (!route) {
    const failed = ["failure", "failed", "error"].includes(normalize(outcome));
    return finish(withRecord, failed ? "failed" : "completed", at, failed ? `${record.nodeTitle} failed and has no failure route.` : undefined);
  }
  return enterNode(withRecord, route.toNodeId, at);
}

export function decideApproval(
  run: WorkflowRun,
  input: { decision: "approved" | "rejected" | "sent_back"; by: Actor; comment?: string; sendBackTo?: string; at?: string }
): WorkflowRun {
  if (run.status !== "waiting_approval") throw new RunError("not_awaiting_approval", "This run is not waiting for an approval.");
  const record = currentRecord(run);
  const at = input.at ?? nowIso();
  const approval = { decision: input.decision, by: input.by, comment: input.comment, sentBackTo: input.sendBackTo };

  if (input.decision === "sent_back") {
    const target = input.sendBackTo;
    if (!target || !run.steps.some((s) => s.nodeId === target)) {
      throw new RunError("invalid_send_back", "Choose an earlier step of this run to send the work back to.");
    }
    const closed: StepRecord = { ...record, completedAt: at, outcome: "sent_back", approval, performedBy: input.by, notes: input.comment };
    return enterNode({ ...run, status: "running", steps: [...run.steps.slice(0, -1), closed] }, target, at);
  }

  const outcome = input.decision === "approved" ? "success" : "failure";
  const route = chooseRoute({ ...run, status: "running" }, record.nodeId, outcome);
  const closed: StepRecord = { ...record, completedAt: at, outcome: input.decision, approval, performedBy: input.by, notes: input.comment, pipeId: route?.pipeId };
  const withRecord: WorkflowRun = { ...run, status: "running", steps: [...run.steps.slice(0, -1), closed] };
  if (!route) return finish(withRecord, input.decision === "approved" ? "completed" : "failed", at, input.decision === "rejected" ? `${record.nodeTitle} was rejected.` : undefined);
  return enterNode(withRecord, route.toNodeId, at);
}

export function cancelRun(run: WorkflowRun, reason?: string, at?: string): WorkflowRun {
  if (isTerminal(run)) throw new RunError("run_finished", `This run is already ${run.status}.`);
  return { ...run, status: "canceled", currentNodeId: undefined, endedAt: at ?? nowIso(), error: reason };
}

export function describeCurrentStep(run: WorkflowRun): CurrentStep {
  const previousOutputs = run.steps
    .filter((s) => s.completedAt)
    .slice(-10)
    .map((s) => ({ nodeId: s.nodeId, title: s.nodeTitle, outcome: s.outcome, output: s.output }));

  if (!run.currentNodeId || isTerminal(run)) {
    return { runId: run.id, status: run.status, step: null, previousOutputs, input: run.input, options: [], hint: `This run is ${run.status}. There is nothing left to do.` };
  }
  const current = node(run.snapshot, run.currentNodeId);
  const spec = run.snapshot.steps[current.id] ?? {};
  const options = outgoingOptions(run.snapshot, current.id);
  const iteration = run.iterations[current.id] ?? 1;
  const hint =
    run.status === "waiting_approval"
      ? "This step needs a person to approve it in Pipes. Check back with get_current_step."
      : options.length === 0
        ? "Do this step, then call complete_step. It is the last step, so the run will finish."
        : options.length === 1
          ? "Do this step, then call complete_step with outcome \"success\" or \"failure\"."
          : "Do this step, then call complete_step. Pass the route label as outcome, or a pipe id as next.";

  return {
    runId: run.id,
    status: run.status,
    step: {
      nodeId: current.id,
      type: current.type,
      title: current.title,
      description: current.description,
      instructions: spec.instructions,
      doneWhen: spec.doneWhen,
      skills: spec.skills ?? [],
      connectionIds: spec.connectionIds ?? [],
      exitCondition: spec.exitCondition,
      iteration,
      maxIterations: current.type === "Loop" || options.some((o) => o.routeKind === "loop") ? spec.maxIterations ?? DEFAULT_MAX_ITERATIONS : undefined
    },
    previousOutputs,
    input: run.input,
    options,
    hint: run.steps[run.steps.length - 1]?.suggestion && run.status === "running" ? `${hint} Pipes suggests a route: ${run.steps[run.steps.length - 1].suggestion!.label}. Pass it as next if you agree.` : hint,
    rails: railsFor(run, spec, current.id),
    suggestion: run.status === "running" ? run.steps[run.steps.length - 1]?.suggestion : undefined
  };
}

/** The limits the current step and run are under, for the performer. Undefined when there are none. */
function railsFor(run: WorkflowRun, spec: WorkflowRun["snapshot"]["steps"][string], nodeId: string): CurrentStep["rails"] {
  const stepRails = spec.rails;
  const budgets = run.snapshot.rails?.budgets;
  const record = run.steps[run.steps.length - 1];
  const done = run.steps.filter((s) => s.completedAt).length;
  const info: NonNullable<CurrentStep["rails"]> = {
    deadlineAt: run.deadlineAt,
    stepTimesOutAt: stepRails?.timeoutMs && record?.nodeId === nodeId ? new Date(new Date(record.startedAt).getTime() + stepRails.timeoutMs).toISOString() : undefined,
    allowedOutcomes: stepRails?.allowedOutcomes,
    outputSchema: stepRails?.output?.schema,
    stepsRemaining: budgets?.maxSteps !== undefined ? Math.max(0, budgets.maxSteps - done) : undefined,
    costRemainingMicros: budgets?.maxCostMicros !== undefined ? Math.max(0, budgets.maxCostMicros - (run.costMicros ?? 0)) : undefined
  };
  return Object.values(info).some((v) => v !== undefined) ? info : undefined;
}
