/**
 * Execution rails: the limits and switches every run passes through.
 *
 * Pipes does not run steps itself (agents do), so its rails sit at the step
 * boundary: handing out a step, completing it, routing, starting a run. See
 * docs/rails.md for the whole design and the failure each rail prevents.
 *
 * Everything here is optional. A workflow with no rails behaves exactly as it
 * did before rails existed.
 */
import type { Actor } from "@/domain/runs/types";

/** Integer micro-dollars. Never floats near money. */
export type Micros = number;

/** Workflow-level rails. Saved on the design document, frozen into each run's snapshot. */
export type WorkflowRails = {
  budgets?: {
    /** Completed step records per run, counting loops and send-backs. */
    maxSteps?: number;
    /** The run's deadline is startedAt plus this. Waiting for a person does not pause it. */
    maxDurationMs?: number;
    /** Sum of the cost agents report on completed steps. */
    maxCostMicros?: Micros;
  };
  concurrency?: {
    /** Running plus waiting-for-approval runs of this workflow at once. */
    maxActiveRuns?: number;
  };
};

/** A JSON Schema subset Pipes validates without a dependency. */
export type OutputSchema =
  | { type: "object"; properties?: Record<string, OutputSchema>; required?: string[]; additionalProperties?: boolean }
  | { type: "array"; items?: OutputSchema; minItems?: number; maxItems?: number }
  | { type: "string"; enum?: string[]; minLength?: number; maxLength?: number; pattern?: string }
  | { type: "number" | "integer"; minimum?: number; maximum?: number }
  | { type: "boolean" };

/** Step-level rails. Saved as StepSpec.rails. */
export type StepRails = {
  /** From entering the step to completing it. Past it, the step times out. */
  timeoutMs?: number;
  /** What happens when the step times out: take its failure route (or fail the run if it has none). */
  onTimeout?: "failure_route" | "fail_run";
  /** The only outcome labels an agent may report. */
  allowedOutcomes?: string[];
  /** The shape the step's output must have. */
  output?: { schema: OutputSchema; onInvalid: "reject" | "failure_route" };
  /** Most a single completion of this step may report spending. */
  maxCostMicros?: Micros;
};

export type KillSwitchMode = "off" | "pause" | "halt";

/**
 * Live, never snapshotted. "pause" refuses new runs and step completions;
 * "halt" does that and cancels every active run in scope.
 */
export type KillSwitch = {
  scope: "workspace" | "workflow";
  targetId: string;
  mode: KillSwitchMode;
  reason?: string;
  setBy: string;
  setAt: string;
};

/** Workspace-wide per-token limits, read live on every MCP call. */
export type RailSettings = {
  tokenLimits: {
    /** All MCP calls per token per minute. Never above the platform ceiling of 240. */
    perMinute: number;
    /** start_run, complete_step and cancel_run per token per minute. */
    writesPerMinute: number;
    /** Runs one token may start per hour. */
    startsPerHour: number;
  };
};

export const DEFAULT_RAIL_SETTINGS: RailSettings = { tokenLimits: { perMinute: 240, writesPerMinute: 120, startsPerHour: 600 } };
export const PLATFORM_CALLS_PER_MINUTE = 240;

export type RailCode =
  | "kill_switch"
  | "concurrency_limit"
  | "budget_steps"
  | "budget_cost"
  | "deadline_exceeded"
  | "step_timeout"
  | "invalid_output"
  | "outcome_not_allowed"
  | "idempotency_conflict"
  | "conflict";

export type RunEventType =
  | "run.started"
  | "step.completed"
  | "step.output_rejected"
  | "step.timed_out"
  | "approval.decided"
  | "run.canceled"
  | "run.deadline_exceeded"
  | "run.finished"
  | "rail.denied";

/**
 * One entry in a run's journal. `seq` equals the run's rev after the event.
 * The engine is pure and takes the clock as an input, so folding a run's
 * events through it rebuilds the run exactly (see journal.ts replay).
 */
export type RunEvent = {
  runId: string;
  seq: number;
  at: string;
  actor: Actor;
  type: RunEventType;
  idempotencyKey?: string;
  data: Record<string, unknown>;
};
