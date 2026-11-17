/**
 * Decisions: Pipes judging a situation instead of leaving every judgment to
 * the agent or a person. See docs/decisions.md.
 *
 * The model makes judgments; code makes decisions. A decision model answers
 * narrow questions with probabilities, and a policy written in code turns
 * those into an action: act, suggest, ask a stronger model, or hand to a
 * person. Every decision leaves a receipt, so it can be audited, labelled
 * and measured before anything is automated.
 */

/** off: never ask. shadow: ask and record, change nothing. live: may act where policy allows. */
export type DecisionMode = "off" | "shadow" | "live";

/** How bad a wrong call is. High-consequence decisions are never automated. */
export type Consequence = "low" | "medium" | "high";

export type DecisionAction = "auto" | "suggest" | "human" | "fallback";

/** What a step's designer allows Pipes to decide. Saved as StepSpec.decide. */
export type StepDecide = {
  /** Decision, Router and Condition steps: pick the route. */
  route?: boolean;
  /** Any step: check the output against doneWhen when it is completed. */
  verifyDoneWhen?: boolean;
  /** How bad a wrong route is here. Defaults to medium. */
  consequence?: Consequence;
  /** Ask the deliberate model when the fast one is unsure. */
  deliberate?: boolean;
};

export type TierRecord = {
  tier: "fast" | "deliberate";
  model: string;
  answers?: unknown;
  latencyMs: number;
  costMicros: number;
  error?: string;
};

export type DecisionKind = "route" | "done_when" | "outcome_map" | "approval_triage";

export type DecisionReceipt = {
  id: string;
  workspaceId: string;
  systemId: string;
  runId?: string;
  nodeId?: string;
  kind: DecisionKind;
  contract: string;
  mode: DecisionMode;
  at: string;
  state: unknown;
  options: Array<{ id: string; label: string }>;
  tiers: TierRecord[];
  action: DecisionAction;
  /** The option chosen (a pipe id, "approve", ...), when there is one. */
  choice?: string;
  confidence?: number;
  /** For yes/no checks: the probability it holds. */
  probability?: number;
  reason: string;
  rationale?: string;
  /** What a person or performer actually did afterwards, for calibration. */
  label?: { value: string; by: string; at: string; agreed: boolean };
  costMicros: number;
};

/** A suggestion attached to the current step for the performer to confirm. */
export type DecisionSuggestion = { receiptId: string; pipeId?: string; label: string; confidence: number; reason: string };
