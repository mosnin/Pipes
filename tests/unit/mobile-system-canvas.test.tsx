import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MobileSystemCanvas, computeFitTransform } from "@/components/mobile/MobileSystemCanvas";
import type { GraphNode, GraphPipe } from "@/components/editor/editor_state";

function mkNode(id: string, x: number, y: number, title: string = id): GraphNode {
  return {
    id,
    type: "step",
    title,
    description: `${id} description`,
    position: { x, y },
    portIds: [`${id}_in`, `${id}_out`],
    config: {},
  };
}

function mkPipe(id: string, from: string, to: string): GraphPipe {
  return {
    id,
    fromPortId: `${from}_out`,
    toPortId: `${to}_in`,
    systemId: "sys",
    fromNodeId: from,
    toNodeId: to,
  };
}

describe("computeFitTransform", () => {
  it("returns identity when there are no nodes", () => {
    const fit = computeFitTransform([], { width: 800, height: 600 });
    expect(fit.scale).toBe(1);
    expect(fit.translate).toEqual({ x: 0, y: 0 });
  });

  it("computes a scale that fits the bounding box inside the viewport", () => {
    const nodes = [mkNode("a", 0, 0), mkNode("b", 800, 600)];
    const fit = computeFitTransform(nodes, { width: 400, height: 300 });
    // Bounding box is wider than the viewport so we must scale down.
    expect(fit.scale).toBeLessThan(1);
    expect(fit.scale).toBeGreaterThan(0);
  });
});

describe("MobileSystemCanvas", () => {
  it("renders a node for each graph entry", () => {
    const nodes = [mkNode("n1", 0, 0, "Planner"), mkNode("n2", 200, 0, "Coder")];
    render(<MobileSystemCanvas nodes={nodes} pipes={[]} onNodeTap={() => {}} />);
    expect(screen.getByLabelText(/open node planner/i)).toBeTruthy();
    expect(screen.getByLabelText(/open node coder/i)).toBeTruthy();
  });

  it("calls onNodeTap when a node is activated via keyboard", () => {
    const nodes = [mkNode("n1", 0, 0, "Planner")];
    const onNodeTap = vi.fn();
    render(<MobileSystemCanvas nodes={nodes} pipes={[]} onNodeTap={onNodeTap} />);
    const target = screen.getByLabelText(/open node planner/i);
    fireEvent.keyDown(target, { key: "Enter" });
    expect(onNodeTap).toHaveBeenCalledWith("n1");
  });

  it("calls onNodeTap on touch tap (no movement)", () => {
    const nodes = [mkNode("n1", 0, 0, "Planner")];
    const onNodeTap = vi.fn();
    const { container } = render(<MobileSystemCanvas nodes={nodes} pipes={[]} onNodeTap={onNodeTap} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const target = screen.getByLabelText(/open node planner/i);

    fireEvent.touchStart(svg!, { touches: [{ clientX: 30, clientY: 30 }] });
    fireEvent.touchEnd(target, { touches: [] });
    expect(onNodeTap).toHaveBeenCalledWith("n1");
  });

  it("renders a path for each resolved pipe", () => {
    const nodes = [mkNode("n1", 0, 0), mkNode("n2", 300, 0)];
    const pipes = [mkPipe("p1", "n1", "n2")];
    const { container } = render(
      <MobileSystemCanvas nodes={nodes} pipes={pipes} onNodeTap={() => {}} />,
    );
    const path = container.querySelector("path");
    expect(path).not.toBeNull();
  });
});
