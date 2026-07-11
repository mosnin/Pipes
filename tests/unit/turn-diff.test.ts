import { describe, expect, it } from "vitest";
import { computeTurnDiff } from "@/lib/agent/turn-diff";
import type { GraphNode, GraphPipe } from "@/components/editor/editor_state";

function node(id: string, title = "node", description?: string): GraphNode {
  return {
    id,
    type: "agent",
    title,
    description,
    position: { x: 0, y: 0 },
    portIds: [`${id}_in`, `${id}_out`],
    config: {},
  };
}

function pipe(id: string, fromNodeId = "a", toNodeId = "b"): GraphPipe {
  return {
    id,
    systemId: "sys",
    fromPortId: `${fromNodeId}_out`,
    toPortId: `${toNodeId}_in`,
    fromNodeId,
    toNodeId,
  };
}

describe("computeTurnDiff", () => {
  it("returns empty arrays for identical snapshots", () => {
    const before = { nodes: [node("a"), node("b")], pipes: [pipe("p1", "a", "b")] };
    const after = { nodes: [node("a"), node("b")], pipes: [pipe("p1", "a", "b")] };
    const diff = computeTurnDiff(before, after);
    expect(diff.nodesAdded).toEqual([]);
    expect(diff.nodesRemoved).toEqual([]);
    expect(diff.nodesUpdated).toEqual([]);
    expect(diff.pipesAdded).toEqual([]);
    expect(diff.pipesRemoved).toEqual([]);
  });

  it("detects added nodes and pipes", () => {
    const before = { nodes: [node("a")], pipes: [] };
    const after = { nodes: [node("a"), node("b")], pipes: [pipe("p1", "a", "b")] };
    const diff = computeTurnDiff(before, after);
    expect(diff.nodesAdded.map((n) => n.id)).toEqual(["b"]);
    expect(diff.pipesAdded.map((p) => p.id)).toEqual(["p1"]);
    expect(diff.nodesRemoved).toEqual([]);
    expect(diff.pipesRemoved).toEqual([]);
  });

  it("detects removed nodes and pipes", () => {
    const before = { nodes: [node("a"), node("b")], pipes: [pipe("p1", "a", "b")] };
    const after = { nodes: [node("a")], pipes: [] };
    const diff = computeTurnDiff(before, after);
    expect(diff.nodesRemoved.map((n) => n.id)).toEqual(["b"]);
    expect(diff.pipesRemoved.map((p) => p.id)).toEqual(["p1"]);
  });

  it("detects updated nodes when title changes", () => {
    const before = { nodes: [node("a", "Old")], pipes: [] };
    const after = { nodes: [node("a", "New")], pipes: [] };
    const diff = computeTurnDiff(before, after);
    expect(diff.nodesUpdated).toHaveLength(1);
    expect(diff.nodesUpdated[0].before.title).toBe("Old");
    expect(diff.nodesUpdated[0].after.title).toBe("New");
  });

  it("detects updated nodes when description changes", () => {
    const before = { nodes: [node("a", "Same", "Old desc")], pipes: [] };
    const after = { nodes: [node("a", "Same", "New desc")], pipes: [] };
    const diff = computeTurnDiff(before, after);
    expect(diff.nodesUpdated).toHaveLength(1);
  });

  it("ignores position-only changes (not surfaced in diff)", () => {
    const a = node("a", "Same");
    const b: GraphNode = { ...node("a", "Same"), position: { x: 100, y: 100 } };
    const diff = computeTurnDiff({ nodes: [a], pipes: [] }, { nodes: [b], pipes: [] });
    expect(diff.nodesUpdated).toEqual([]);
  });

  it("handles empty snapshots on both sides", () => {
    const diff = computeTurnDiff({ nodes: [], pipes: [] }, { nodes: [], pipes: [] });
    expect(diff.nodesAdded).toEqual([]);
    expect(diff.nodesRemoved).toEqual([]);
    expect(diff.nodesUpdated).toEqual([]);
    expect(diff.pipesAdded).toEqual([]);
    expect(diff.pipesRemoved).toEqual([]);
  });

  it("is deterministic across calls", () => {
    const before = { nodes: [node("a"), node("b")], pipes: [pipe("p1")] };
    const after = { nodes: [node("a"), node("c")], pipes: [pipe("p2")] };
    const d1 = computeTurnDiff(before, after);
    const d2 = computeTurnDiff(before, after);
    expect(d1).toEqual(d2);
  });
});
