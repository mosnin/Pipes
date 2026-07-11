import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AnimatedCanvas, type CanvasEdge, type CanvasNode } from "@/components/marketing/AnimatedCanvas";

const NODES: ReadonlyArray<CanvasNode> = [
  { id: "a", title: "A", x: 0, y: 100 },
  { id: "b", title: "B", x: 300, y: 100 },
  { id: "c", title: "C", x: 600, y: 100 },
];

const EDGES: ReadonlyArray<CanvasEdge> = [
  { fromId: "a", toId: "b" },
  { fromId: "b", toId: "c" },
];

describe("AnimatedCanvas", () => {
  it("renders an SVG with role=img and the provided aria label", () => {
    const { container } = render(
      <AnimatedCanvas
        nodes={NODES}
        edges={EDGES}
        progress={1}
        ariaLabel="three nodes"
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("role")).toBe("img");
    expect(svg!.getAttribute("aria-label")).toBe("three nodes");
  });

  it("renders nothing for nodes when progress is 0", () => {
    const { container } = render(
      <AnimatedCanvas nodes={NODES} edges={EDGES} progress={0} />,
    );
    const a = container.querySelector('[data-testid="node-a"]');
    expect(a).not.toBeNull();
    // Opacity attribute reflects progress; at progress=0 the first node is invisible.
    expect(a!.getAttribute("opacity")).toBe("0");
  });

  it("renders all nodes fully visible at progress=1", () => {
    const { container } = render(
      <AnimatedCanvas nodes={NODES} edges={EDGES} progress={1} />,
    );
    for (const node of NODES) {
      const el = container.querySelector(`[data-testid="node-${node.id}"]`);
      expect(el).not.toBeNull();
      expect(el!.getAttribute("opacity")).toBe("1");
    }
  });

  it("hides edges until the gating nodes are visible enough", () => {
    const { container } = render(
      <AnimatedCanvas
        nodes={NODES}
        edges={EDGES}
        progress={0.05}
        nodeStart={0}
        nodeEnd={0.55}
        edgeStart={0.5}
        edgeEnd={1}
      />,
    );
    // At progress 0.05 the b/c nodes are not yet visible enough -> no edges
    const edgeAB = container.querySelector('[data-testid="edge-a-b"]');
    expect(edgeAB).toBeNull();
  });

  it("renders all edges at progress=1", () => {
    const { container } = render(
      <AnimatedCanvas nodes={NODES} edges={EDGES} progress={1} />,
    );
    expect(container.querySelector('[data-testid="edge-a-b"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="edge-b-c"]')).not.toBeNull();
  });

  it("can hide the grid when noGrid is set", () => {
    const { container } = render(
      <AnimatedCanvas
        nodes={NODES}
        edges={EDGES}
        progress={1}
        noGrid
      />,
    );
    // The grid is a rect filled via url(#ac-grid). When noGrid is true, we
    // omit that rect.
    const gridRect = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("fill") === "url(#ac-grid)",
    );
    expect(gridRect).toBeUndefined();
  });

  it("clamps progress to the [0, 1] range", () => {
    // Negative progress: same as 0.
    const { container: cNeg } = render(
      <AnimatedCanvas nodes={NODES} edges={EDGES} progress={-2} />,
    );
    const aNeg = cNeg.querySelector('[data-testid="node-a"]');
    expect(aNeg!.getAttribute("opacity")).toBe("0");
    // Progress > 1: same as 1.
    const { container: cBig } = render(
      <AnimatedCanvas nodes={NODES} edges={EDGES} progress={5} />,
    );
    const aBig = cBig.querySelector('[data-testid="node-a"]');
    expect(aBig!.getAttribute("opacity")).toBe("1");
  });
});
