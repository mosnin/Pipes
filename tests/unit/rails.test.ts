import { describe, expect, it } from "vitest";
import { DESIGN_KIND } from "@/domain/design/service";
import { expire, gateComplete } from "@/domain/rails/gate";
import { replay } from "@/domain/rails/journal";
import { sanitizeStepRails, sanitizeWorkflowRails, validateOutput } from "@/domain/rails/validate";
import { startRun } from "@/domain/runs/engine";
import { createRunService, RUN_KIND } from "@/domain/runs/service";
import type { StepSpec, WorkflowRun, WorkflowSnapshot } from "@/domain/runs/types";
import type { AppContext, RepositorySet, StoredDocument } from "@/lib/repositories/contracts";

/**
 * An in-memory store with the same commit semantics as Convex. `beforeCommit`
 * runs between a writer's read and its write, so a test can slip a second
 * writer in exactly where a real race would.
 */
function memoryRepos(snapshot: WorkflowSnapshot, design: { steps?: Record<string, StepSpec>; rails?: unknown } = {}) {
  const docs = new Map<string, StoredDocument<any>>();
  const key = (kind: string, id: string) => `${kind}/${id}`;
  const hooks: { beforeCommit?: () => Promise<void> } = {};
  const now = () => new Date().toISOString();
  const write = (d: { kind: string; id: string; workspaceId: string; refId?: string; data: unknown }) => {
    const prev = docs.get(key(d.kind, d.id));
    docs.set(key(d.kind, d.id), { ...d, createdAt: prev?.createdAt ?? now(), updatedAt: now() } as StoredDocument<any>);
  };
  const repos = {
    documents: {
      async get(kind: string, id: string) {
        return docs.get(key(kind, id)) ?? null;
      },
      async put(input: any) {
        write(input);
        return docs.get(key(input.kind, input.id));
      },
      async list(kind: string, filter: { workspaceId?: string; refId?: string }) {
        return [...docs.values()].filter((d) => d.kind === kind && (!filter.workspaceId || d.workspaceId === filter.workspaceId) && (!filter.refId || d.refId === filter.refId));
      },
      async remove(kind: string, id: string) {
        docs.delete(key(kind, id));
      },
      async commit(input: any) {
        const hook = hooks.beforeCommit;
        hooks.beforeCommit = undefined;
        if (hook) await hook();
        const existing = docs.get(key(input.put.kind, input.put.id));
        const currentRev = existing ? Number(existing.data?.rev ?? 0) : -1;
        if (currentRev !== input.put.expectedRev) return { ok: false, currentRev };
        const { expectedRev: _e, ...put } = input.put;
        for (const d of [put, ...(input.inserts ?? [])]) write(d);
        return { ok: true };
      }
    },
    systems: {
      async getBundle() {
        return {
          system: { id: "sys", workspaceId: "wks", name: "Refunds" },
          nodes: snapshot.nodes.map((n) => ({ ...n })),
          pipes: snapshot.pipes.map((p) => ({ ...p })),
          versions: []
        };
      }
    },
    audits: { async add() {} }
  } as unknown as RepositorySet;
  write({ kind: DESIGN_KIND, id: "sys", workspaceId: "wks", refId: "sys", data: { steps: design.steps ?? snapshot.steps, routes: snapshot.routes, nodeDefinitions: {}, subsystems: [], rails: design.rails } });
  return { repos, docs, hooks };
}

const ctx: AppContext = { userId: "usr_1", workspaceId: "wks", role: "Owner", plan: "Pro", actorType: "agent", actorId: "agt_1" } as AppContext;
const person: AppContext = { ...ctx, actorType: "user", actorId: "usr_1" };

const flow: WorkflowSnapshot = {
  nodes: [
    { id: "in", type: "Input", title: "Request in" },
    { id: "check", type: "Agent", title: "Check the request" },
    { id: "pay", type: "Action", title: "Pay the refund" },
    { id: "fail", type: "Action", title: "Tell the customer no" }
  ],
  pipes: [
    { id: "p1", fromNodeId: "in", toNodeId: "check" },
    { id: "p2", fromNodeId: "check", toNodeId: "pay" },
    { id: "p3", fromNodeId: "check", toNodeId: "fail" }
  ],
  steps: {},
  routes: { p2: { routeKind: "success" }, p3: { routeKind: "failure" } }
};

describe("execution rails: correctness", () => {
  it("never lets two concurrent completions of the same step both land", async () => {
    const { repos, hooks } = memoryRepos(flow);
    const runs = createRunService(repos);
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    // Agent B completes "in" between agent A's read and A's commit.
    hooks.beforeCommit = async () => {
      await runs.complete(ctx, run.id, { nodeId: "in", outcome: "success" });
    };
    // A retries, re-reads, and its nodeId guard turns the duplicate into a stale step.
    await expect(runs.complete(ctx, run.id, { nodeId: "in", outcome: "success" })).rejects.toMatchObject({ code: "stale_step" });
    const after = await runs.get(ctx, run.id);
    expect(after.steps.filter((s) => s.nodeId === "in" && s.completedAt)).toHaveLength(1);
    expect(after.currentNodeId).toBe("check");
  });

  it("recognises a retried completion by its idempotency key", async () => {
    const { repos, docs } = memoryRepos(flow);
    const runs = createRunService(repos);
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    const first = await runs.complete(ctx, run.id, { outcome: "success", idempotencyKey: "k1" });
    const second = await runs.complete(ctx, run.id, { outcome: "success", idempotencyKey: "k1" });
    expect(second.currentNodeId).toBe(first.currentNodeId);
    expect(second.steps.filter((s) => s.completedAt)).toHaveLength(1);
    const stepUsage = [...docs.values()].filter((d) => d.kind === "usage_event" && d.data.metric === "step_completed");
    expect(stepUsage).toHaveLength(1);
  });

  it("returns the same run for a retried start with the same key", async () => {
    const { repos, docs } = memoryRepos(flow);
    const runs = createRunService(repos);
    const a = await runs.start(ctx, { systemId: "sys", trigger: "mcp", idempotencyKey: "start-1" });
    const b = await runs.start(ctx, { systemId: "sys", trigger: "mcp", idempotencyKey: "start-1" });
    expect(b.id).toBe(a.id);
    expect([...docs.values()].filter((d) => d.kind === RUN_KIND)).toHaveLength(1);
  });

  it("journals every change, and replaying the journal rebuilds the run exactly", async () => {
    const { repos } = memoryRepos(flow);
    const runs = createRunService(repos);
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp", input: { order: 7 } });
    await runs.complete(ctx, run.id, { outcome: "success", output: { ok: true } });
    await runs.complete(ctx, run.id, { outcome: "failure", notes: "Not eligible" });
    const stored = await runs.get(ctx, run.id);
    const events = await runs.events(ctx, run.id);
    expect(events.map((e) => e.type)).toEqual(["run.started", "step.completed", "step.completed"]);
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(replay(stored.snapshot, events)).toEqual(stored);
  });
});

describe("execution rails: the stop button", () => {
  it("pause refuses new runs and step completions; off lets them through again", async () => {
    const { repos } = memoryRepos(flow);
    const runs = createRunService(repos);
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    await runs.setKillSwitch(person, { scope: "workspace", mode: "pause", reason: "Investigating refunds" });
    await expect(runs.start(ctx, { systemId: "sys", trigger: "mcp" })).rejects.toMatchObject({ code: "kill_switch" });
    await expect(runs.complete(ctx, run.id, { outcome: "success" })).rejects.toMatchObject({ code: "kill_switch" });
    await runs.setKillSwitch(person, { scope: "workspace", mode: "off" });
    await expect(runs.complete(ctx, run.id, { outcome: "success" })).resolves.toMatchObject({ currentNodeId: "check" });
  });

  it("halt on a workflow cancels its active runs", async () => {
    const { repos } = memoryRepos(flow);
    const runs = createRunService(repos);
    const a = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    const result = await runs.setKillSwitch(person, { scope: "workflow", systemId: "sys", mode: "halt", reason: "Bad deploy" });
    expect(result.canceled).toBe(1);
    expect((await runs.get(ctx, a.id)).status).toBe("canceled");
  });
});

describe("execution rails: limits", () => {
  it("refuses a start over the workflow's concurrency limit", async () => {
    const { repos } = memoryRepos(flow, { rails: { concurrency: { maxActiveRuns: 1 } } });
    const runs = createRunService(repos);
    await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    await expect(runs.start(ctx, { systemId: "sys", trigger: "mcp" })).rejects.toMatchObject({ code: "concurrency_limit" });
  });

  it("ends a run that reaches its step budget", async () => {
    const { repos } = memoryRepos(flow, { rails: { budgets: { maxSteps: 1 } } });
    const runs = createRunService(repos);
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    const after = await runs.complete(ctx, run.id, { outcome: "success" });
    expect(after.status).toBe("failed");
    expect(after.errorCode).toBe("budget_steps");
  });

  it("refuses a completion that would go over the run's cost limit", async () => {
    const { repos } = memoryRepos(flow, { rails: { budgets: { maxCostMicros: 1000 } } });
    const runs = createRunService(repos);
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    await runs.complete(ctx, run.id, { outcome: "success", costMicros: 800 });
    await expect(runs.complete(ctx, run.id, { outcome: "success", costMicros: 300 })).rejects.toMatchObject({ code: "budget_cost" });
    expect((await runs.get(ctx, run.id)).costMicros).toBe(800);
  });

  it("enforces allowed outcomes and output contracts on a step", async () => {
    const steps = { check: { rails: { allowedOutcomes: ["approve", "deny"], output: { schema: { type: "object", required: ["amount"], properties: { amount: { type: "number" } } }, onInvalid: "reject" } } } };
    const { repos } = memoryRepos({ ...flow, routes: { p2: { routeKind: "conditional", label: "approve" }, p3: { routeKind: "conditional", label: "deny" } } }, { steps: steps as never });
    const runs = createRunService(repos);
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    await runs.complete(ctx, run.id, { outcome: "success" });
    await expect(runs.complete(ctx, run.id, { outcome: "maybe" })).rejects.toMatchObject({ code: "outcome_not_allowed" });
    await expect(runs.complete(ctx, run.id, { outcome: "approve", output: { amount: "ten" } })).rejects.toMatchObject({ code: "invalid_output" });
    const ok = await runs.complete(ctx, run.id, { outcome: "approve", output: { amount: 10 } });
    expect(ok.currentNodeId).toBe("pay");
  });

  it("routes an invalid output down the failure route when the contract says so", () => {
    const snap: WorkflowSnapshot = { ...flow, steps: { check: { rails: { output: { schema: { type: "object", required: ["amount"] }, onInvalid: "failure_route" } } } } };
    let run = startRun({ id: "r", systemId: "sys", workspaceId: "wks", systemName: "Refunds", snapshot: snap, startedBy: ctx as never, trigger: "api", startNodeId: "check" });
    const decision = gateComplete(run, { outcome: "success", output: {} }, []);
    expect(decision).toMatchObject({ allow: true, value: { outcome: "failure" } });
    run = { ...run };
    expect(run.currentNodeId).toBe("check");
  });

  it("fails a run past its deadline, and times out a slow step down its failure route", () => {
    const snap: WorkflowSnapshot = { ...flow, rails: { budgets: { maxDurationMs: 60_000 } }, steps: { check: { rails: { timeoutMs: 1000 } } } };
    const run = startRun({ id: "r", systemId: "sys", workspaceId: "wks", systemName: "Refunds", snapshot: snap, startedBy: { type: "agent", id: "a" }, trigger: "api", startNodeId: "check", at: "2026-01-01T00:00:00.000Z" });
    expect(run.deadlineAt).toBe("2026-01-01T00:01:00.000Z");
    const timedOut = expire(run, "2026-01-01T00:00:02.000Z");
    expect(timedOut.reason).toBe("step_timeout");
    expect(timedOut.run.currentNodeId).toBe("fail");
    expect(timedOut.run.steps[0].endReason).toBe("timeout");
    const late = expire(run, "2026-01-01T00:02:00.000Z");
    expect(late.reason).toBe("deadline");
    expect(late.run).toMatchObject({ status: "failed", errorCode: "deadline_exceeded" });
  });

  it("applies due time rails when a run is read, and journals them", async () => {
    const { repos, docs } = memoryRepos(flow, { rails: { budgets: { maxDurationMs: 1000 } } });
    const runs = createRunService(repos);
    const run = await runs.start(ctx, { systemId: "sys", trigger: "mcp" });
    const stored = docs.get(`${RUN_KIND}/${run.id}`)!;
    stored.data = { ...(stored.data as WorkflowRun), deadlineAt: "2000-01-01T00:00:00.000Z" };
    const read = await runs.get(ctx, run.id);
    expect(read).toMatchObject({ status: "failed", errorCode: "deadline_exceeded" });
    expect((await runs.events(ctx, run.id)).map((e) => e.type)).toEqual(["run.started", "run.deadline_exceeded"]);
  });
});

describe("execution rails: contracts", () => {
  it("validates outputs against the schema subset with readable paths", () => {
    expect(validateOutput({ type: "object", required: ["a"], properties: { a: { type: "integer", minimum: 1 } } }, { a: 0.5 })).toEqual(["output.a: expected a whole number", "output.a: must be at least 1"]);
    expect(validateOutput({ type: "array", items: { type: "string", enum: ["x"] } }, ["x", "y"])).toEqual(["output[1]: must be one of x"]);
    expect(validateOutput({ type: "boolean" }, true)).toEqual([]);
  });

  it("drops malformed rails instead of storing them", () => {
    expect(sanitizeWorkflowRails({ budgets: { maxSteps: -3, maxDurationMs: "soon" } })).toBeUndefined();
    expect(sanitizeWorkflowRails({ budgets: { maxSteps: 12.7 } })).toEqual({ budgets: { maxSteps: 12, maxDurationMs: undefined, maxCostMicros: undefined }, concurrency: undefined });
    expect(sanitizeStepRails({ timeoutMs: 5000, output: { schema: { type: "nonsense" } } })).toEqual({ timeoutMs: 5000, onTimeout: "failure_route", allowedOutcomes: undefined, output: undefined, maxCostMicros: undefined });
  });
});
