/**
 * Every question Pipes asks a decision model, in one file, versioned. Changing
 * wording changes behaviour, so bump the version and replay receipts before
 * shipping it (docs/decisions.md).
 *
 * Writing rules, from the decision-model guidance Pipes follows:
 * - send evidence (the step, its instructions, what came before), never a conclusion;
 * - one narrow judgment per question;
 * - pair every choice with a yes/no "does any option fit?" so a forced pick is visible;
 * - criteria describe the situation each option is for, in plain words.
 */
import type { Question } from "@/lib/ai/openrouter/client";
import type { NextOption, WorkflowRun } from "@/domain/runs/types";

export const CONTRACTS = {
  route: "route@1",
  doneWhen: "done_when@1",
  outcomeMap: "outcome_map@1",
  approvalTriage: "approval_triage@1"
} as const;

/** What a person would look at, as named fields. Never secrets; outputs are capped. */
export function runState(run: WorkflowRun, nodeId?: string) {
  const cap = (value: unknown) => {
    const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
    return text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
  };
  const node = nodeId ? run.snapshot.nodes.find((n) => n.id === nodeId) : undefined;
  const spec = nodeId ? run.snapshot.steps[nodeId] : undefined;
  return {
    workflow: run.systemName,
    input: cap(run.input),
    step: node ? { title: node.title, type: node.type, description: node.description, instructions: spec?.instructions, doneWhen: spec?.doneWhen } : undefined,
    previousSteps: run.steps
      .filter((s) => s.completedAt)
      .slice(-5)
      .map((s) => ({ title: s.nodeTitle, outcome: s.outcome, output: cap(s.output), notes: s.notes }))
  };
}

const optionText = (o: NextOption, notes?: string) => [o.label ? `Route "${o.label}"` : `The ${o.routeKind} route`, `leads to "${o.toNodeTitle}"`, notes].filter(Boolean).join(", ");

/** Which route out of a Decision, Router or Condition step fits the situation. */
export function routeQuestions(run: WorkflowRun, options: NextOption[]): Record<string, Question> {
  const criteria = Object.fromEntries(options.map((o) => [o.pipeId, optionText(o, [run.snapshot.routes[o.pipeId]?.conditionLabel, run.snapshot.routes[o.pipeId]?.notes].filter(Boolean).join(". "))]));
  return {
    route: { type: "choice", instructions: "Given the workflow step and what earlier steps produced, which route should the run take next?", criteria },
    fits: { type: "noul", instructions: "Does one of the listed routes clearly describe what should happen next, given the step and what earlier steps produced?" },
    enough_evidence: { type: "noul", instructions: "Do the step's instructions and the earlier steps' outputs contain the information needed to choose a route?" }
  };
}

/** Did the step's output meet its doneWhen? */
export function doneWhenQuestions(doneWhen: string): Record<string, Question> {
  return {
    met: { type: "noul", instructions: `The step's finish line is: "${doneWhen}". Does the reported output and notes show that this finish line was met?` }
  };
}

/** The agent reported an outcome in its own words; which route did it mean? */
export function outcomeQuestions(run: WorkflowRun, options: NextOption[]): Record<string, Question> {
  return {
    route: { type: "choice", instructions: "The performer reported the outcome in `reported` in its own words. Which route did it mean?", criteria: Object.fromEntries(options.map((o) => [o.pipeId, optionText(o)])) },
    fits: { type: "noul", instructions: "Does the reported outcome clearly correspond to one of the listed routes?" }
  };
}

/** A person is about to decide an approval: what would Pipes suggest, and how risky is it? */
export function triageQuestions(canSendBack: boolean): Record<string, Question> {
  const criteria: Record<string, string> = {
    approve: "The work before this approval is complete, matches its instructions, and nothing in it looks wrong or risky.",
    reject: "The work is wrong, harmful, out of policy, or should not go ahead at all."
  };
  if (canSendBack) criteria.send_back = "The work is on the right track but incomplete or needs a correction before it can go ahead.";
  return {
    decision: { type: "choice", instructions: "A person must approve or reject the work done so far in this run. Based on the earlier steps' outputs and the approval step's instructions, what should they do?", criteria },
    risk: {
      type: "score",
      instructions: "How much harm would approving this cause if the work turned out to be wrong?",
      criteria: ["None: easily undone, internal only", "Low: small and reversible", "Medium: affects a customer or money, can be fixed", "High: hard to undo, legal, financial or safety impact"]
    },
    complete: { type: "noul", instructions: "Did the steps before this approval finish what their instructions asked for?" }
  };
}
