import { describe, expect, it } from "vitest";
import { DESIGN_KIND } from "@/domain/design/service";
import { createDecisionService, type DecisionClients } from "@/domain/decisions/service";
import { doneWhenVerdict, routePolicy } from "@/domain/decisions/policy";
import { mockDecideFast } from "@/lib/ai/openrouter/mock";
import { createRunService } from "@/domain/runs/service";
import type { StepSpec, WorkflowSnapshot } from "@/domain/runs/types";
import type { Answer } from "@/lib/ai/openrouter/client";
import type { AppContext, RepositorySet, StoredDocument } from "@/lib/repositories/contracts";

function memoryRepos(snapshot: WorkflowSnapshot, steps: Record<string, StepSpec>) {
  const docs = new Map<string, StoredDocument<any>>();
  const k = (kind: string, id: string) => `${kind}/${id}`;
  const write = (d: any) => docs.set(k(d.kind, d.id), { ...d, createdAt: "", updatedAt: "" });
  const repos = {
    documents: {
      async get(kind: string, id: string) {
        return docs.get(k(kind, id)) ?? null;
      },
      async put(input: any) {
        write(input);
        return docs.get(k(input.kind, input.id));
      },
      async list(kind: string, f: { workspaceId?: string; refId?: string }) {
        return [...docs.values()].filter((d) => d.kind === kind && (!f.workspaceId || d.workspaceId === f.workspaceId) && (!f.refId || d.refId === f.refId));
      },
      async remove() {},
      async commit(input: any) {
        const existing = docs.get(k(input.put.kind, input.put.id));
        const currentRev = existing ? Number(existing.data?.rev ?? 0) : -1;
        if (currentRev !== input.put.expectedRev) return { ok: false, currentRev };
        const { expectedRev: _e, ...put } = input.put;
        for (const d of [put, ...(input.inserts ?? [])]) write(d);
        return { ok: true };
      }
    },
    systems: { async getBundle() { return { system: { id: "sys", workspaceId: "wks", name: "Support" }, nodes: snapshot.nodes, pipes: snapshot.pipes, versions: [] }; } },
    audits: { async add() {} }
  } as unknown as RepositorySet;
  write({ kind: DESIGN_KIND, id: "sys", workspaceId: "wks", refId: "sys", data: { steps, routes: snapshot.routes, nodeDefinitions: {}, subsystems: [] } });
  return { repos, docs };
}

const ctx = { userId: "u", workspaceId: "wks", role: "Owner", plan: "Pro", actorType: "agent", actorId: "agt" } as AppContext;
const person = { ...ctx, actorType: "user", actorId: "usr" } as AppContext;

const flow: WorkflowSnapshot = {
  nodes: [
    { id: "in", type: "Input", title: "Ticket in" },
    { id: "route", type: "Decision", title: "Refund or question?" },
    { id: "refund", type: "Action", title: "Process the refund" },
    { id: "answer", type: "Agent", title: "Answer the question" }
  ],
  pipes: [
    { id: "p1", fromNodeId: "in", toNodeId: "route" },
    { id: "p2", fromNodeId: "route", toNodeId: "refund" },
    { id: "p3", fromNodeId: "route", toNodeId: "answer" }
  ],
  steps: {},
  routes: { p2: { routeKind: "conditional", label: "refund" }, p3: { routeKind: "conditional", label: "question" } }
};

/** A fake decision model that answers whatever the test scripts. */
function scripted(answers: Record<string, Answer>, calls: string[] = []): DecisionClients {
  return {
    fast: async (_state, questions) => {
      calls.push(Object.keys(questions).join(","));
      return { answers: Object.fromEntries(Object.keys(questions).map((q) => [q, answers[q]])), model: "test/jev", costMicros: 7, latencyMs: 1 };
    }
  };
}

const sure = { route: { type: "choice", choice: "p2", confidence: 0.95, probabilities: { p2: 0.97, p3: 0.03 } }, fits: { type: "noul", noul: 0.92 }, enough_evidence: { type: "noul", noul: 0.9 } } as Record<string, Answer>;

describe("decisions: routing", () => {
  it("in live mode, takes a confident route itself and records who decided", async () => {
    const { repos } = memoryRepos(flow, { route: { decide: { route: true, consequence: "low" } } });
    const decisions = createDecisionService(repos, { clients: scripted(sure), mode: "live" });
    const runs = createRunService(repos, { decisions });
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp", input: { text: "I want my money back" } });
    const after = await runs.complete(ctx, run.id, { outcome: "success" });
    expect(after.currentNodeId).toBe("refund");
    const decided = after.steps.find((s) => s.nodeId === "route")!;
    expect(decided.performedBy?.id).toBe("decider");
    expect(decided.decidedBy?.confidence).toBe(0.95);
    const receipts = await decisions.list("wks");
    expect(receipts[0]).toMatchObject({ kind: "route", action: "auto", choice: "p2", costMicros: 7 });
  });

  it("in shadow mode, only suggests, and labels the suggestion with what the performer chose", async () => {
    const { repos } = memoryRepos(flow, { route: { decide: { route: true } } });
    const decisions = createDecisionService(repos, { clients: scripted(sure), mode: "shadow" });
    const runs = createRunService(repos, { decisions });
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    const atDecision = await runs.complete(ctx, run.id, { outcome: "success" });
    expect(atDecision.currentNodeId).toBe("route");
    const current = await runs.current(ctx, run.id);
    expect(current.suggestion).toMatchObject({ pipeId: "p2", label: "refund" });
    expect(current.hint).toContain("Pipes suggests a route: refund");
    await runs.complete(ctx, run.id, { next: "p3" });
    const [receipt] = await decisions.list("wks");
    expect(receipt.label).toMatchObject({ value: "p3", agreed: false });
  });

  it("hands a no-fit situation to a person instead of guessing", () => {
    const answers = { ...sure, fits: { type: "noul", noul: 0.1 } } as Record<string, Answer>;
    expect(routePolicy(answers, { mode: "live", consequence: "low", liveOptions: ["p2", "p3"] }).action).toBe("human");
  });

  it("never automates a high-consequence route", () => {
    expect(routePolicy(sure, { mode: "live", consequence: "high", liveOptions: ["p2", "p3"] }).action).toBe("suggest");
  });

  it("falls back to today's behaviour when the model fails", async () => {
    const { repos } = memoryRepos(flow, { route: { decide: { route: true, consequence: "low" } } });
    const failing: DecisionClients = { fast: async () => { throw new Error("down"); } };
    const runs = createRunService(repos, { decisions: createDecisionService(repos, { clients: failing, mode: "live" }) });
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    const after = await runs.complete(ctx, run.id, { outcome: "success" });
    expect(after.currentNodeId).toBe("route");
    expect(after.steps.at(-1)?.suggestion).toBeUndefined();
  });

  it("asks nothing when decisions are off or the step did not opt in", async () => {
    const calls: string[] = [];
    const { repos } = memoryRepos(flow, {});
    const runs = createRunService(repos, { decisions: createDecisionService(repos, { clients: scripted(sure, calls), mode: "live" }) });
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    await runs.complete(ctx, run.id, { outcome: "success" });
    expect(calls).toEqual([]);
  });
});

describe("decisions: outcomes, done-when and approvals", () => {
  it("maps a free-text outcome to the route the performer meant", async () => {
    const answers = { route: { type: "choice", choice: "p3", confidence: 0.93, probabilities: { p2: 0.04, p3: 0.96 } }, fits: { type: "noul", noul: 0.9 } } as Record<string, Answer>;
    const { repos } = memoryRepos(flow, {});
    const runs = createRunService(repos, { decisions: createDecisionService(repos, { clients: scripted(answers), mode: "live" }) });
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    await runs.complete(ctx, run.id, { outcome: "success" });
    const after = await runs.complete(ctx, run.id, { outcome: "they only had a question about shipping" });
    expect(after.currentNodeId).toBe("answer");
  });

  it("flags a completion that does not meet doneWhen, without blocking it", async () => {
    const answers = { met: { type: "noul", noul: 0.08 } } as Record<string, Answer>;
    const { repos } = memoryRepos(flow, { in: { doneWhen: "The ticket has an order number.", decide: { verifyDoneWhen: true } } });
    const runs = createRunService(repos, { decisions: createDecisionService(repos, { clients: scripted(answers), mode: "shadow" }) });
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    const after = await runs.complete(ctx, run.id, { outcome: "success", output: { text: "hello" } });
    expect(after.currentNodeId).toBe("route");
    expect(after.steps[0].check).toMatchObject({ verdict: "not_met", probability: 0.08 });
    expect(doneWhenVerdict(0.5)).toBe("unsure");
  });

  it("suggests an approval decision, and labels it with what the person decided", async () => {
    const approvalFlow: WorkflowSnapshot = {
      nodes: [
        { id: "draft", type: "Agent", title: "Draft the refund" },
        { id: "ok", type: "HumanApproval", title: "Approve the refund" },
        { id: "pay", type: "Action", title: "Pay" }
      ],
      pipes: [
        { id: "a", fromNodeId: "draft", toNodeId: "ok" },
        { id: "b", fromNodeId: "ok", toNodeId: "pay" }
      ],
      steps: {},
      routes: { b: { routeKind: "success" } }
    };
    const answers = { decision: { type: "choice", choice: "approve", confidence: 0.8, probabilities: { approve: 0.86 } }, risk: { type: "score", score: 1.2, confidence: 0.6, probabilities: {} }, complete: { type: "noul", noul: 0.9 } } as Record<string, Answer>;
    const { repos } = memoryRepos(approvalFlow, {});
    const decisions = createDecisionService(repos, { clients: scripted(answers), mode: "shadow" });
    const runs = createRunService(repos, { decisions });
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    const waiting = await runs.complete(ctx, run.id, { outcome: "success", output: { amount: 20 } });
    const triage = await decisions.triageApproval(waiting);
    expect(triage).toMatchObject({ action: "suggest", choice: "approve", risk: 1.2, complete: 0.9 });
    expect((await decisions.triageApproval(waiting))?.id).toBe(triage?.id); // cached per revision
    await runs.decide(person, run.id, { decision: "rejected" });
    const labelled = (await decisions.list("wks")).find((r) => r.kind === "approval_triage");
    expect(labelled?.label).toMatchObject({ value: "reject", agreed: false });
    const calibration = await decisions.calibration("wks");
    expect(calibration.bands.find((b) => b.band === "70 to 89%")).toMatchObject({ labelled: 1, agreement: 0 });
  });
});

describe("decisions: the mock model", () => {
  it("is deterministic and favours the option the state talks about", () => {
    const q = { route: { type: "choice" as const, instructions: "Which route?", criteria: { p2: "refund money back", p3: "question about shipping" } } };
    const a = mockDecideFast({ text: "I want my money back, a refund please" }, q);
    const b = mockDecideFast({ text: "I want my money back, a refund please" }, q);
    expect(a).toEqual(b);
    expect((a.answers.route as { choice: string }).choice).toBe("p2");
  });
});
