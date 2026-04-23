import { describe, expect, it } from "vitest";
import { presentPipes, summarizeTrace, traceEdgesFromSteps } from "@/components/editor/pipe_semantics";

describe("pipe semantics presentation", () => {
  it("traces edge ids from simulation steps", () => {
    const ids = traceEdgesFromSteps(
      [{ nodeId: "a" }, { nodeId: "b" }, { nodeId: "c" }],
      [
        { id: "p1", fromPortId: "a_out", toPortId: "b_in", systemId: "s", fromNodeId: "a", toNodeId: "b" },
        { id: "p2", fromPortId: "b_out", toPortId: "c_in", systemId: "s", fromNodeId: "b", toNodeId: "c" }
      ]
    );
    expect(ids).toEqual(["p1", "p2"]);
  });

  it("applies labels and route styling", () => {
    const edges = presentPipes({
      baseEdges: [{ id: "p1", source: "a", target: "b" }],
      pipes: [{ id: "p1", fromPortId: "a_out", toPortId: "b_in", systemId: "s", fromNodeId: "a", toNodeId: "b" }],
      selectedEdgeIds: ["p1"],
      tracedEdgeIds: [],
      invalidEdgeIds: [],
      semantics: { p1: { pipeId: "p1", label: "Primary", routeKind: "success" } },
      nodeDefinitions: {
        a: { nodeId: "a", nodeType: "Agent", overview: {}, input: { portType: "any", fields: [] }, output: { portType: "json", fields: [] }, updatedAt: 0 },
        b: { nodeId: "b", nodeType: "Tool", overview: {}, input: { portType: "json", fields: [] }, output: { portType: "json", fields: [] }, updatedAt: 0 }
      }
    });
    expect(String(edges[0].label)).toContain("Primary");
    expect(edges[0].interactionWidth).toBe(36);
  });

  it("summarizes branches and loops", () => {
    const summary = summarizeTrace(
      [
        { nodeId: "a", summary: "start" },
        { nodeId: "b", summary: "decision" },
        { nodeId: "a", summary: "loop" }
      ],
      [
        { id: "p1", fromPortId: "a_out", toPortId: "b_in", systemId: "s", fromNodeId: "a", toNodeId: "b" },
        { id: "p2", fromPortId: "b_out", toPortId: "a_in", systemId: "s", fromNodeId: "b", toNodeId: "a" }
      ],
      { p2: { pipeId: "p2", routeKind: "conditional", conditionLabel: "retry" } }
    );
    expect(summary.branchDecisions[0]).toContain("retry");
    expect(summary.loopSummaries.length).toBeGreaterThan(0);
  });
});
