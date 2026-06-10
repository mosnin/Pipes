import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { createRef } from "react";
import { ParallaxLayer } from "@/components/marketing/ParallaxLayer";

/**
 * ParallaxLayer tests.
 *
 * The hook drives translation off scroll progress. In jsdom the progress is
 * always 0 (no scroll, getBoundingClientRect returns zeros), so we assert:
 *   - the layer renders its children
 *   - it sets a translate3d transform on the inline style
 *   - prefers-reduced-motion produces a zero offset
 *   - depth and testId props round-trip via data attributes
 */

function setReducedMotion(reduce: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe("ParallaxLayer", () => {
  beforeEach(() => {
    setReducedMotion(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children inside an absolutely-positioned layer", () => {
    const ref = createRef<HTMLDivElement>();
    const { container, getByText } = render(
      <div ref={ref}>
        <ParallaxLayer depth={0.5} containerRef={ref}>
          <p>layer body</p>
        </ParallaxLayer>
      </div>,
    );
    expect(getByText("layer body")).toBeTruthy();
    const layer = container.querySelector("[data-parallax-depth]");
    expect(layer).not.toBeNull();
    expect((layer as HTMLElement).className).toContain("absolute");
    expect((layer as HTMLElement).className).toContain("inset-0");
  });

  it("applies a translate3d transform on the inline style", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={ref}>
        <ParallaxLayer depth={0.5} containerRef={ref}>
          <span>x</span>
        </ParallaxLayer>
      </div>,
    );
    const layer = container.querySelector(
      "[data-parallax-depth]",
    ) as HTMLElement;
    const style = layer.getAttribute("style") ?? "";
    expect(style).toContain("translate3d(");
    expect(style.toLowerCase()).toContain("will-change: transform");
  });

  it("round-trips the depth and testId props via data attributes", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={ref}>
        <ParallaxLayer depth={0.35} containerRef={ref} testId="bg-layer">
          <span>x</span>
        </ParallaxLayer>
      </div>,
    );
    const layer = container.querySelector('[data-testid="bg-layer"]');
    expect(layer).not.toBeNull();
    expect((layer as HTMLElement).getAttribute("data-parallax-depth")).toBe(
      "0.35",
    );
  });

  it("merges the className prop onto the layer root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={ref}>
        <ParallaxLayer
          depth={0}
          containerRef={ref}
          className="depth-glow-indigo"
          testId="bg-layer"
        >
          <span>x</span>
        </ParallaxLayer>
      </div>,
    );
    const layer = container.querySelector(
      '[data-testid="bg-layer"]',
    ) as HTMLElement;
    expect(layer.className).toContain("depth-glow-indigo");
  });

  it("renders a zero translate offset under prefers-reduced-motion", () => {
    setReducedMotion(true);
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={ref}>
        <ParallaxLayer depth={1} containerRef={ref} testId="bg-layer">
          <span>x</span>
        </ParallaxLayer>
      </div>,
    );
    const layer = container.querySelector(
      '[data-testid="bg-layer"]',
    ) as HTMLElement;
    const style = layer.getAttribute("style") ?? "";
    // Zero offset: translate3d(0, 0.00px, 0).
    expect(style).toMatch(/translate3d\(\s*0\s*,\s*0(\.0+)?px\s*,\s*0\s*\)/);
  });

  it("marks the layer aria-hidden so the parallax backdrop is silent to AT", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={ref}>
        <ParallaxLayer depth={0} containerRef={ref} testId="bg-layer">
          <span>x</span>
        </ParallaxLayer>
      </div>,
    );
    const layer = container.querySelector(
      '[data-testid="bg-layer"]',
    ) as HTMLElement;
    expect(layer.getAttribute("aria-hidden")).toBe("true");
  });
});
