import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyFrame,
  buildSyntheticFrames,
  emptyTickState,
  fixtureKeyForTemplate,
  runReplay,
  totalProgressUnits,
  type ReplayFrame,
  type ReplayTickState,
} from "@/lib/marketing/playground-replay";
import { starterTemplates } from "@/domain/templates/catalog";

const FRAMES: ReplayFrame[] = [
  { event: "status", delay_ms: 0, data: { state: "thinking" } },
  {
    event: "tool_call",
    delay_ms: 0,
    data: { tool_name: "add_node", arguments: { title: "A" } },
  },
  {
    event: "tool_result",
    delay_ms: 0,
    data: {
      action: {
        action: "addNode",
        clientNodeId: "n1",
        type: "Node",
        title: "A",
      },
    },
  },
  {
    event: "tool_result",
    delay_ms: 0,
    data: {
      action: {
        action: "addNode",
        clientNodeId: "n2",
        type: "Node",
        title: "B",
      },
    },
  },
  {
    event: "tool_result",
    delay_ms: 0,
    data: {
      action: {
        action: "addPipe",
        fromNodeId: "n1",
        toNodeId: "n2",
      },
    },
  },
  { event: "done", delay_ms: 0, data: {} },
];

describe("totalProgressUnits", () => {
  it("counts nodes + pipes from tool_result frames", () => {
    expect(totalProgressUnits(FRAMES)).toBe(3);
  });
  it("returns at least 1 even when there are no actionable frames", () => {
    expect(totalProgressUnits([{ event: "status", data: {} }])).toBe(1);
  });
});

describe("applyFrame reducer", () => {
  it("captures status changes without moving past the priming offset", () => {
    const next = applyFrame(emptyTickState(), FRAMES[0]!, 3, 0);
    expect(next.state.status).toBe("thinking");
    expect(next.state.progress).toBeGreaterThan(0);
    expect(next.state.progress).toBeLessThan(0.5);
    expect(next.shouldContinue).toBe(true);
  });

  it("appends node ids and bumps progress on addNode", () => {
    let state: ReplayTickState = emptyTickState();
    state = applyFrame(state, FRAMES[2]!, 3, 0).state;
    expect(state.nodeIds).toEqual(["n1"]);
    state = applyFrame(state, FRAMES[3]!, 3, 0).state;
    expect(state.nodeIds).toEqual(["n1", "n2"]);
    expect(state.progress).toBeCloseTo(2 / 3, 5);
  });

  it("appends pipe keys on addPipe", () => {
    let state: ReplayTickState = emptyTickState();
    state = applyFrame(state, FRAMES[2]!, 3, 0).state;
    state = applyFrame(state, FRAMES[3]!, 3, 0).state;
    state = applyFrame(state, FRAMES[4]!, 3, 0).state;
    expect(state.pipeKeys).toEqual(["n1->n2"]);
    expect(state.progress).toBeCloseTo(1, 5);
  });

  it("on done sets progress to 1 and stops the runner", () => {
    const result = applyFrame(emptyTickState(), FRAMES[5]!, 3, 0);
    expect(result.state.done).toBe(true);
    expect(result.state.progress).toBe(1);
    expect(result.shouldContinue).toBe(false);
  });
});

describe("buildSyntheticFrames", () => {
  it("produces a frame list with one addNode per node and one addPipe per pipe", () => {
    const template = starterTemplates.find(
      (t) => t.id === "multi-agent-handoff",
    );
    expect(template).toBeTruthy();
    const frames = buildSyntheticFrames(template!);
    const nodeAdds = frames.filter(
      (f) =>
        f.event === "tool_result" &&
        (f.data as { action?: { action?: string } }).action?.action ===
          "addNode",
    ).length;
    const pipeAdds = frames.filter(
      (f) =>
        f.event === "tool_result" &&
        (f.data as { action?: { action?: string } }).action?.action ===
          "addPipe",
    ).length;
    expect(nodeAdds).toBe(template!.nodes.length);
    expect(pipeAdds).toBe(template!.pipes.length);
    // Last frame must be `done`.
    expect(frames[frames.length - 1]?.event).toBe("done");
  });
});

describe("fixtureKeyForTemplate", () => {
  it("maps the support templates to customer-support", () => {
    expect(fixtureKeyForTemplate("customer-support-triage")).toBe(
      "customer-support",
    );
    expect(fixtureKeyForTemplate("support-ops-system")).toBe(
      "customer-support",
    );
  });
  it("maps known engineering and sales templates to their fixtures", () => {
    expect(fixtureKeyForTemplate("code-review-assistant")).toBe("code-review");
    expect(fixtureKeyForTemplate("sales-lead-qualifier")).toBe("lead-qualifier");
  });
  it("returns null for templates without a hand-authored fixture", () => {
    expect(fixtureKeyForTemplate("document-qa-system")).toBeNull();
  });
});

describe("runReplay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits ticks until done in reduceMotion mode (no delays)", async () => {
    const ticks: ReplayTickState[] = [];
    runReplay({
      frames: FRAMES,
      reduceMotion: true,
      onTick: (s) => {
        ticks.push(s);
      },
    });
    // All frames have delay_ms=0 so the microtask queue can drain.
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(ticks[ticks.length - 1]?.done).toBe(true);
    expect(ticks[ticks.length - 1]?.progress).toBe(1);
    // We saw at least one node and the pipe arrive.
    expect(
      ticks.some((t) => t.nodeIds.includes("n1") && t.nodeIds.includes("n2")),
    ).toBe(true);
    expect(ticks.some((t) => t.pipeKeys.includes("n1->n2"))).toBe(true);
  });

  it("stops emitting after cancel when frames carry real delays", async () => {
    // Build a fresh frame list with a non-zero delay so the runner suspends
    // on the first sleep. Cancelling then must prevent any tick at all.
    const slowFrames: ReplayFrame[] = FRAMES.map((f) => ({ ...f, delay_ms: 50 }));
    const ticks: ReplayTickState[] = [];
    const ctrl = runReplay({
      frames: slowFrames,
      onTick: (s) => {
        ticks.push(s);
      },
    });
    ctrl.cancel();
    await new Promise<void>((r) => setTimeout(r, 200));
    // After cancel we never reach a `done` tick.
    const last = ticks[ticks.length - 1];
    expect(last?.done ?? false).toBe(false);
  });
});
