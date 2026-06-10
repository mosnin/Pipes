import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

/**
 * HeroScrollDemo tests
 *
 * We force prefers-reduced-motion: reduce so the demo collapses to its
 * final-state render (progress = 1). This sidesteps the rAF + scroll
 * machinery in jsdom and lets us assert structure cleanly.
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

// jsdom doesn't ship IntersectionObserver; framer-motion's useInView needs it.
class StubIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback) {
    void _callback;
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root: Element | null = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];
}
(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  StubIntersectionObserver as unknown as typeof IntersectionObserver;

describe("HeroScrollDemo", () => {
  beforeEach(() => {
    setReducedMotion(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the outer scroll wrapper with a tall height to drive progress", async () => {
    const { HeroScrollDemo } = await import(
      "@/components/marketing/HeroScrollDemo"
    );
    const { container } = render(<HeroScrollDemo />);
    const outer = container.querySelector(
      '[data-testid="hero-scroll-demo-outer"]',
    );
    expect(outer).not.toBeNull();
    // The outer container must be taller than the viewport (300vh) so the
    // scroll progress hook can actually drive the demo.
    expect((outer as HTMLElement).style.height).toBe("300vh");
  });

  it("renders the sticky inner container that pins the demo at 100vh", async () => {
    const { HeroScrollDemo } = await import(
      "@/components/marketing/HeroScrollDemo"
    );
    const { container } = render(<HeroScrollDemo />);
    const sticky = container.querySelector(
      '[data-testid="hero-scroll-demo-sticky"]',
    );
    expect(sticky).not.toBeNull();
    expect((sticky as HTMLElement).className).toContain("sticky");
    expect((sticky as HTMLElement).className).toContain("top-0");
    expect((sticky as HTMLElement).className).toContain("h-screen");
  });

  it("renders six beat labels in the timeline", async () => {
    const { HeroScrollDemo } = await import(
      "@/components/marketing/HeroScrollDemo"
    );
    const { container } = render(<HeroScrollDemo />);
    const timeline = container.querySelector(
      '[data-testid="beat-timeline"]',
    );
    expect(timeline).not.toBeNull();
    // Each beat label is a span; there are six.
    const labels = timeline!.querySelectorAll("span.t-caption");
    expect(labels.length).toBe(6);
  });

  it("under reduced motion, renders the final state: prompt, plan, canvas, claude panel, connect button", async () => {
    const { HeroScrollDemo } = await import(
      "@/components/marketing/HeroScrollDemo"
    );
    const { container } = render(<HeroScrollDemo />);
    expect(
      container.querySelector('[data-testid="prompt-input"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="plan-card"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="animated-canvas"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="claude-panel"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="connect-button"]'),
    ).not.toBeNull();
  });

  it("under reduced motion, the typed prompt is fully visible at the final state", async () => {
    const { HeroScrollDemo } = await import(
      "@/components/marketing/HeroScrollDemo"
    );
    const { container } = render(<HeroScrollDemo />);
    const prompt = container.querySelector('[data-testid="prompt-input"]');
    expect(prompt).not.toBeNull();
    expect(prompt!.textContent ?? "").toContain("Planner agent");
    expect(prompt!.textContent ?? "").toContain("opens a PR");
  });

  it("under reduced motion, the connect button's glow class is active", async () => {
    const { HeroScrollDemo } = await import(
      "@/components/marketing/HeroScrollDemo"
    );
    const { container } = render(<HeroScrollDemo />);
    const button = container.querySelector('[data-testid="connect-button"]');
    expect(button).not.toBeNull();
    // At progress=1 the indigo border and indigo bg are present in inline styles.
    // jsdom serializes color hexes as rgb(), so check for the rgb form.
    const style = (button as HTMLElement).getAttribute("style") ?? "";
    expect(style).toMatch(/rgb\(\s*79,\s*70,\s*229\s*\)/);
    expect(style.toLowerCase()).toContain("box-shadow");
  });

  it("accepts an id prop for in-page anchors", async () => {
    const { HeroScrollDemo } = await import(
      "@/components/marketing/HeroScrollDemo"
    );
    const { container } = render(<HeroScrollDemo id="scroll-demo" />);
    const outer = container.querySelector("#scroll-demo");
    expect(outer).not.toBeNull();
  });
});
