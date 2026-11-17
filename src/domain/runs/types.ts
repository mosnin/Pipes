/**
 * Runs: an agent (or a person) walking a workflow one step at a time.
 *
 * Pipes does not execute steps itself. It holds the procedure, hands out the
 * current step with everything needed to do it, records what happened, and
 * decides where the run goes next. The agent does the work.
 */

import type { DecisionSuggestion, StepDecide } from "@/domain/decisions/types";
import type { Micros, StepRails, WorkflowRails } from "@/domain/rails/types";

export type RouteKind = "default" | "success" | "failure" | "conditional" | "loop";

/** What an agent needs to carry out one step. Stored per node in the system design. */
export type StepSpec = {
  /** Plain-language instructions for whoever performs the step. */
  instructions?: string;
  /** How to tell the step is finished. */
  doneWhen?: string;
  /** Skills the performer should load (names or URLs). */
  skills?: string[];
  /** Workspace connection ids (MCP servers, APIs) the step uses. */
  connectionIds?: string[];
  /** Loop steps: how many times the loop route may be taken before the run exits it. */
  maxIterations?: number;
  /** Loop steps: when to stop looping, in words. */
  exitCondition?: string;
  /** Human approval steps: who may approve. */
  approverRole?: "Owner" | "Admin" | "Editor";
  /** Limits on this step: timeout, allowed outcomes, output contract, cost. See docs/rails.md. */
  rails?: StepRails;
  /** What Pipes may judge on this step with a decision model. See docs/decisions.md. */
  decide?: StepDecide;
};

export type RouteSpec = { routeKind: RouteKind; label?: string; conditionLabel?: string; notes?: string };

export type SnapshotNode = { id: string; type: string; title: string; description?: string };
export type SnapshotPipe = { id: string; fromNodeId: string; toNodeId: string };

/** The workflow exactly as it was when the run started. Runs never see later edits. */
export type WorkflowSnapshot = {
  nodes: SnapshotNode[];
  pipes: SnapshotPipe[];
  steps: Record<string, StepSpec>;
  routes: Record<string, RouteSpec>;
  /** Workflow-level rails, frozen with the run. */
  rails?: WorkflowRails;
};

export type RunStatus = "running" | "waiting_approval" | "completed" | "failed" | "canceled";
export type Actor = { type: "user" | "agent" | "trigger"; id: string; label?: string };

export type StepRecord = {
  index: number;
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  startedAt: string;
  completedAt?: string;
  /** success | failure | a route label the performer chose */
  outcome?: string;
  output?: unknown;
  notes?: string;
  performedBy?: Actor;
  /** The route taken out of this step. */
  pipeId?: string;
  approval?: { decision: "approved" | "rejected" | "sent_back"; by: Actor; comment?: string; sentBackTo?: string };
  /** What the performer reported spending on this step. */
  costMicros?: Micros;
  /** The key the completion was sent with, so a retry is recognised. */
  idempotencyKey?: string;
  /** Why the step ended, when it was not a normal completion. */
  endReason?: "timeout" | "deadline" | "canceled";
  /** A route Pipes suggested for this step, for the performer to confirm. */
  suggestion?: DecisionSuggestion;
  /** Pipes chose this step's route itself (live decisions). */
  decidedBy?: { receiptId: string; confidence: number };
  /** Pipes' check of the output against doneWhen. Never blocks; it flags. */
  check?: { receiptId: string; verdict: "met" | "not_met" | "unsure"; probability?: number; reason: string };
};

export type WorkflowRun = {
  id: string;
  systemId: string;
  workspaceId: string;
  systemName: string;
  versionId?: string;
  versionName?: string;
  status: RunStatus;
  input?: unknown;
  currentNodeId?: string;
  steps: StepRecord[];
  iterations: Record<string, number>;
  startedBy: Actor;
  trigger: "manual" | "api" | "mcp" | "webhook" | "schedule";
  startedAt: string;
  endedAt?: string;
  error?: string;
  /** A machine-readable code beside `error`, for example "deadline_exceeded". */
  errorCode?: string;
  snapshot: WorkflowSnapshot;
  /** Increments on every saved change. A save only lands if the rev has not moved (compare and set). */
  rev?: number;
  /** startedAt plus the workflow's maxDurationMs, when it has one. */
  deadlineAt?: string;
  /** Sum of reported step costs. */
  costMicros?: Micros;
};

export type NextOption = { pipeId: string; toNodeId: string; toNodeTitle: string; routeKind: RouteKind; label?: string };

/** The payload an agent receives for the step it should do now. */
export type CurrentStep = {
  runId: string;
  status: RunStatus;
  step: {
    nodeId: string;
    type: string;
    title: string;
    description?: string;
    instructions?: string;
    doneWhen?: string;
    skills: string[];
    connectionIds: string[];
    exitCondition?: string;
    iteration: number;
    maxIterations?: number;
  } | null;
  /** The limits this step and run are under, so the performer can see them. */
  rails?: {
    deadlineAt?: string;
    stepTimesOutAt?: string;
    allowedOutcomes?: string[];
    outputSchema?: unknown;
    stepsRemaining?: number;
    costRemainingMicros?: Micros;
  };
  /** Outputs of earlier steps, newest last, so the performer has context. */
  previousOutputs: Array<{ nodeId: string; title: string; outcome?: string; output?: unknown }>;
  input?: unknown;
  /** Where the run can go after this step. Pass `next` (a pipe id) when there is more than one. */
  options: NextOption[];
  /** One-line guidance for the performer. */
  hint: string;
  /** A route Pipes suggests for this step, when decisions are on and it has one. */
  suggestion?: DecisionSuggestion;
};
