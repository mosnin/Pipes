import { describe, expect, it } from "vitest";
import { autoArrange, collapseAwareGraph, computeSubsystemBoundary, createSubsystemFromSelection } from "@/components/editor/structure_model";

describe("structure model", () => {
  it("creates subsystem from selection", () => {
    const subsystem = createSubsystemFromSelection({ id: "sub_1", name: "Ops", nodeIds: ["a", "b", "b"] });
    expect(subsystem.nodeIds).toEqual(["a", "b"]);
    expect(subsystem.collapsed).toBe(true);
  });

  it("computes subsystem boundaries", () => {
    const boundary = computeSubsystemBoundary(
      { id: "sub", name: "S", nodeIds: ["n2"], collapsed: true, createdAt: 0 },
      [
        { id: "p1", fromPortId: "n1_out", toPortId: "n2_in", systemId: "s", fromNodeId: "n1", toNodeId: "n2" },
        { id: "p2", fromPortId: "n2_out", toPortId: "n3_in", systemId: "s", fromNodeId: "n2", toNodeId: "n3" }
      ]
    );
    expect(boundary.inboundNodeIds).toEqual(["n1"]);
    expect(boundary.outboundNodeIds).toEqual(["n3"]);
  });

  it("renders collapse-aware graph", () => {
    const view = collapseAwareGraph({
      nodes: [
        { id: "n1", title: "A", type: "Agent", position: { x: 0, y: 0 }, portIds: [] },
        { id: "n2", title: "B", type: "Tool", position: { x: 120, y: 0 }, portIds: [] },
        { id: "n3", title: "C", type: "Output", position: { x: 240, y: 0 }, portIds: [] }
      ],
      pipes: [
        { id: "p1", fromPortId: "n1_out", toPortId: "n2_in", systemId: "s", fromNodeId: "n1", toNodeId: "n2" },
        { id: "p2", fromPortId: "n2_out", toPortId: "n3_in", systemId: "s", fromNodeId: "n2", toNodeId: "n3" }
      ],
      subsystems: [{ id: "sub", name: "Module", nodeIds: ["n2"], collapsed: true, createdAt: 1 }]
    });
    expect(view.flowNodes.some((node) => node.id === "sub")).toBe(true);
    expect(view.flowEdges.some((edge) => edge.source === "n1" && edge.target === "sub")).toBe(true);
  });

  it("auto arranges nodes", () => {
    const arranged = autoArrange(
      [
        { id: "n1", title: "A", type: "Agent", position: { x: 0, y: 0 }, portIds: [] },
        { id: "n2", title: "B", type: "Tool", position: { x: 0, y: 0 }, portIds: [] }
      ],
      ["n1", "n2"],
      "left_to_right"
    );
    expect(arranged[1].position.x).toBeGreaterThan(arranged[0].position.x);
  });
});
