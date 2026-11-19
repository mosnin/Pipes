import { describe, expect, it } from "vitest";
import { cancelRun, completeStep, decideApproval, describeCurrentStep, findStartNode, RunError, startRun } from "@/domain/runs/engine";
import type { WorkflowSnapshot } from "@/domain/runs/types";

const agent = { type: "agent" as const, id: "agt_1" };
const person = { type: "user" as const, id: "usr_1" };

function snapshot(partial: Partial<WorkflowSnapshot>): WorkflowSnapshot {
  return { nodes: [], pipes: [], steps: {}, routes: {}, ...partial };
}

const support = snapshot({
  nodes: [
    { id: "in", type: "Input", title: "Ticket in" },
    { id: "triage", type: "Agent", title: "Triage" },
    { id: "refund", type: "HumanApproval", title: "Approve refund" },
    { id: "reply", type: "Agent", title: "Draft reply" },
    { id: "escalate", type: "Action", title: "Escalate" },
    { id: "note", type: "Annotation", title: "A note" }
  ],
  pipes: [
    { id: "p1", fromNodeId: "in", toNodeId: "triage" },
    { id: "p2", fromNodeId: "triage", toNodeId: "refund" },
    { id: "p3", fromNodeId: "triage", toNodeId: "reply" },
    { id: "p4", fromNodeId: "refund", toNodeId: "reply" },
    { id: "p5", fromNodeId: "refund", toNodeId: "escalate" }
  ],
  steps: { triage: { instructions: "Classify the ticket.", doneWhen: "A category is chosen.", skills: ["support-triage"] } },
  routes: {
    p2: { routeKind: "conditional", label: "refund" },
    p3: { routeKind: "conditional", label: "question" },
    p4: { routeKind: "success" },
    p5: { routeKind: "failure" }
  }
});

const start = (snap: WorkflowSnapshot) =>
  startRun({ id: "run_1", systemId: "sys", workspaceId: "wks", systemName: "Support", snapshot: snap, startedBy: agent, trigger: "api" });

describe("run engine", () => {
  it("starts at the entry node and skips annotations", () => {
    expect(findStartNode(support)).toBe("in");
    const run = start(support);
    expect(run.currentNodeId).toBe("in");
    expect(run.status).toBe("running");
  });

  it("hands out instructions, done-when and skills for the current step", () => {
    let run = start(support);
    run = completeStep(run, { performedBy: agent, output: { ticket: 42 } });
    const current = describeCurrentStep(run);
    expect(current.step?.title).toBe("Triage");
    expect(current.step?.instructions).toBe("Classify the ticket.");
    expect(current.step?.skills).toEqual(["support-triage"]);
    expect(current.options.map((o) => o.label)).toEqual(["refund", "question"]);
    expect(current.previousOutputs[0].output).toEqual({ ticket: 42 });
  });

  it("follows a labeled route and pauses at a human approval", () => {
    let run = completeStep(start(support), { performedBy: agent });
    run = completeStep(run, { performedBy: agent, outcome: "refund" });
    expect(run.currentNodeId).toBe("refund");
    expect(run.status).toBe("waiting_approval");
    expect(() => completeStep(run, { performedBy: agent })).toThrow(RunError);
    run = decideApproval(run, { decision: "approved", by: person });
    expect(run.currentNodeId).toBe("reply");
    run = completeStep(run, { performedBy: agent });
    expect(run.status).toBe("completed");
    expect(run.steps.map((s) => s.nodeId)).toEqual(["in", "triage", "refund", "reply"]);
  });

  it("routes a rejection down the failure route", () => {
    let run = completeStep(start(support), { performedBy: agent });
    run = completeStep(run, { performedBy: agent, next: "p2" });
    run = decideApproval(run, { decision: "rejected", by: person, comment: "Over the limit" });
    expect(run.currentNodeId).toBe("escalate");
  });

  it("can send work back to an earlier step", () => {
    let run = completeStep(start(support), { performedBy: agent });
    run = completeStep(run, { performedBy: agent, outcome: "refund" });
    run = decideApproval(run, { decision: "sent_back", by: person, sendBackTo: "triage" });
    expect(run.currentNodeId).toBe("triage");
    expect(run.iterations.triage).toBe(2);
  });

  it("asks the performer to choose when routes are ambiguous", () => {
    const run = completeStep(start(support), { performedBy: agent });
    expect(() => completeStep(run, { performedBy: agent, outcome: "success" })).toThrow(/possible routes/);
  });

  it("rejects a stale step id", () => {
    const run = start(support);
    expect(() => completeStep(run, { performedBy: agent, nodeId: "triage" })).toThrow(/current step is in/);
  });

  it("ends as failed when a step fails with no failure route", () => {
    const linear = snapshot({ nodes: [{ id: "a", type: "Input", title: "A" }, { id: "b", type: "Agent", title: "B" }], pipes: [{ id: "x", fromNodeId: "a", toNodeId: "b" }] });
    let run = completeStep(start(linear), { performedBy: agent });
    run = completeStep(run, { performedBy: agent, outcome: "failure" });
    expect(run.status).toBe("failed");
    expect(run.error).toMatch(/no failure route/);
  });

  it("stops looping at the iteration limit and takes the exit", () => {
    const loop = snapshot({
      nodes: [
        { id: "in", type: "Input", title: "In" },
        { id: "write", type: "Agent", title: "Write tests" },
        { id: "check", type: "Loop", title: "Tests pass?" },
        { id: "done", type: "Output", title: "Done" }
      ],
      pipes: [
        { id: "a", fromNodeId: "in", toNodeId: "write" },
        { id: "b", fromNodeId: "write", toNodeId: "check" },
        { id: "retry", fromNodeId: "check", toNodeId: "write" },
        { id: "exit", fromNodeId: "check", toNodeId: "done" }
      ],
      steps: { check: { maxIterations: 2, exitCondition: "All tests pass" } },
      routes: { retry: { routeKind: "loop", label: "retry" }, exit: { routeKind: "success", label: "pass" } }
    });
    let run = completeStep(start(loop), { performedBy: agent });
    run = completeStep(run, { performedBy: agent }); // write -> check
    expect(describeCurrentStep(run).step?.maxIterations).toBe(2);
    run = completeStep(run, { performedBy: agent, outcome: "retry" }); // back to write (2nd visit)
    expect(run.currentNodeId).toBe("write");
    run = completeStep(run, { performedBy: agent }); // check again
    run = completeStep(run, { performedBy: agent, outcome: "retry" }); // limit reached: exit instead
    expect(run.currentNodeId).toBe("done");
  });

  it("cancels and refuses further work", () => {
    const run = cancelRun(start(support), "No longer needed");
    expect(run.status).toBe("canceled");
    expect(() => completeStep(run, { performedBy: agent })).toThrow(/already canceled/);
  });

  it("refuses to start an empty workflow", () => {
    expect(() => start(snapshot({}))).toThrow(/no steps/);
  });
});
