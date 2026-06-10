import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TemplatePreviewCard } from "@/components/marketing/TemplatePreviewCard";

const CATALOG = {
  nodes: [
    { id: "a", type: "Node", title: "Inbound", x: 100, y: 100 },
    { id: "b", type: "Node", title: "Planner", x: 340, y: 100 },
    { id: "c", type: "Node", title: "Output", x: 580, y: 100 },
  ] as const,
  pipes: [
    { fromNodeId: "a", toNodeId: "b" },
    { fromNodeId: "b", toNodeId: "c" },
  ] as const,
};

const BASE_PROPS = {
  id: "test-template",
  slug: "test-template",
  title: "Test starter",
  description: "A description of what the agent builds.",
  category: "Engineering",
  useCase: "Showcases the preview card",
  complexity: "standard",
  preview: "3 nodes - 2 connections",
  catalog: CATALOG,
};

describe("TemplatePreviewCard", () => {
  it("renders title, description, category, use case and preview", () => {
    render(<TemplatePreviewCard {...BASE_PROPS} />);
    expect(screen.getByText("Test starter")).toBeTruthy();
    expect(screen.getByText("A description of what the agent builds.")).toBeTruthy();
    expect(screen.getByText("Engineering")).toBeTruthy();
    expect(screen.getByText("Showcases the preview card")).toBeTruthy();
    expect(screen.getByText("3 nodes - 2 connections")).toBeTruthy();
  });

  it("renders a complexity StatusBadge", () => {
    render(<TemplatePreviewCard {...BASE_PROPS} />);
    expect(screen.getByText("Standard")).toBeTruthy();
  });

  it("renders an animated canvas preview region with progress=0 at rest", () => {
    render(<TemplatePreviewCard {...BASE_PROPS} />);
    const canvas = screen.getByTestId(`template-card-canvas-${BASE_PROPS.slug}`);
    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute("data-progress")).toBe("0.000");
    expect(canvas.getAttribute("data-played")).toBe("false");
  });

  it("plays a build animation when the card is hovered", async () => {
    // jsdom doesn't run rAF naturally — install a controllable fake
    const originalRAF = global.requestAnimationFrame;
    const originalCAF = global.cancelAnimationFrame;
    const callbacks: Array<(t: number) => void> = [];
    let id = 0;
    global.requestAnimationFrame = ((cb: (t: number) => void) => {
      callbacks.push(cb);
      return ++id;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = (() => undefined) as typeof cancelAnimationFrame;

    try {
      render(<TemplatePreviewCard {...BASE_PROPS} />);
      const card = screen.getByTestId(`template-card-${BASE_PROPS.slug}`);
      const canvas = screen.getByTestId(`template-card-canvas-${BASE_PROPS.slug}`);

      // Start at 0.
      expect(canvas.getAttribute("data-progress")).toBe("0.000");

      // Trigger hover and step the animation through to completion.
      await act(async () => {
        fireEvent.mouseEnter(card);
      });

      // Run a few rAF ticks. PLAY_DURATION_MS is 1400; jump past it.
      await act(async () => {
        const pending = callbacks.splice(0, callbacks.length);
        pending.forEach((cb) => cb(0));
      });
      await act(async () => {
        const pending = callbacks.splice(0, callbacks.length);
        pending.forEach((cb) => cb(2000));
      });

      const updated = screen.getByTestId(`template-card-canvas-${BASE_PROPS.slug}`);
      // After enough elapsed time we should be at 1.000 (clamped).
      expect(updated.getAttribute("data-progress")).toBe("1.000");
      expect(updated.getAttribute("data-played")).toBe("true");
    } finally {
      global.requestAnimationFrame = originalRAF;
      global.cancelAnimationFrame = originalCAF;
    }
  });

  it("links to the template detail page", () => {
    const { container } = render(<TemplatePreviewCard {...BASE_PROPS} />);
    const link = container.querySelector(`a[href="/templates/${BASE_PROPS.slug}"]`);
    expect(link).not.toBeNull();
  });

  it("renders without a canvas when catalog is null", () => {
    render(<TemplatePreviewCard {...BASE_PROPS} catalog={null} />);
    // Preview string is still rendered in the empty region.
    expect(screen.getAllByText("3 nodes - 2 connections").length).toBeGreaterThan(0);
  });
});
