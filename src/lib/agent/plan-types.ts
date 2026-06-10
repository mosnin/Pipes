// Shared types for the interactive plan editor.
//
// The Python builder emits a `plan_proposal` SSE event before any tool_call;
// the steps it carries are user-editable cards in PlanEditor. The user can
// disable, reorder, or rewrite each step, then send the edited list back as
// `executeSteps` on a follow-up POST to /api/agent/build.
//
// Discriminated union on `kind` so TypeScript narrows args correctly when the
// editor renders each step's detail row.

export type PlanStepKind =
  | "add_node"
  | "add_pipe"
  | "update_node"
  | "delete_node"
  | "validate";

export type PlanStepArgsAddNode = {
  title: string;
  description?: string;
  type?: string;
  x?: number;
  y?: number;
};

export type PlanStepArgsAddPipe = {
  // References to earlier plan step ids. The runner resolves these into the
  // actual node ids returned by the prior add_node tool_results.
  fromStepId?: string;
  toStepId?: string;
  // Already-resolved node ids (used on re-execute when the caller has them).
  fromNodeId?: string;
  toNodeId?: string;
};

export type PlanStepArgsUpdateNode = {
  nodeId: string;
  title?: string;
  description?: string;
};

export type PlanStepArgsDeleteNode = {
  nodeId: string;
};

export type PlanStepArgsValidate = Record<string, never>;

export type PlanStep =
  | {
      id: string;
      kind: "add_node";
      label: string;
      args: PlanStepArgsAddNode;
      enabled?: boolean;
    }
  | {
      id: string;
      kind: "add_pipe";
      label: string;
      args: PlanStepArgsAddPipe;
      enabled?: boolean;
    }
  | {
      id: string;
      kind: "update_node";
      label: string;
      args: PlanStepArgsUpdateNode;
      enabled?: boolean;
    }
  | {
      id: string;
      kind: "delete_node";
      label: string;
      args: PlanStepArgsDeleteNode;
      enabled?: boolean;
    }
  | {
      id: string;
      kind: "validate";
      label: string;
      args: PlanStepArgsValidate;
      enabled?: boolean;
    };

export type PlanProposal = {
  planText: string;
  steps: PlanStep[];
  autoExecuteAfterMs: number;
};

// Type guards. The PlanEditor uses these to render the right detail row per
// step. Keeping them tiny so the bundle cost is one constant per kind.
export function isAddNodeStep(
  step: PlanStep,
): step is Extract<PlanStep, { kind: "add_node" }> {
  return step.kind === "add_node";
}

export function isAddPipeStep(
  step: PlanStep,
): step is Extract<PlanStep, { kind: "add_pipe" }> {
  return step.kind === "add_pipe";
}
