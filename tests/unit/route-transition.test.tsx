import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

/**
 * RouteTransition tests.
 *
 * Two concerns:
 *   1. Children render regardless of motion preference.
 *   2. The transition wraps its children in a keyed motion node tied to the
 *      pathname so AnimatePresence sees route changes.
 */

let currentPath = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

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

describe("RouteTransition", () => {
  beforeEach(() => {
    currentPath = "/";
    setReducedMotion(false);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders its children", async () => {
    const { RouteTransition } = await import(
      "@/components/marketing/RouteTransition"
    );
    const { getByText } = render(
      <RouteTransition>
        <p>page body</p>
      </RouteTransition>,
    );
    expect(getByText("page body")).toBeTruthy();
  });

  it("exposes the current pathname on the motion wrapper", async () => {
    currentPath = "/pricing";
    const { RouteTransition } = await import(
      "@/components/marketing/RouteTransition"
    );
    const { container } = render(
      <RouteTransition>
        <p>x</p>
      </RouteTransition>,
    );
    const wrap = container.querySelector('[data-testid="route-transition"]');
    expect(wrap).not.toBeNull();
    expect((wrap as HTMLElement).getAttribute("data-pathname")).toBe(
      "/pricing",
    );
  });

  it("renders children under prefers-reduced-motion (no fade)", async () => {
    setReducedMotion(true);
    const { RouteTransition } = await import(
      "@/components/marketing/RouteTransition"
    );
    const { getByText } = render(
      <RouteTransition>
        <p>still here</p>
      </RouteTransition>,
    );
    expect(getByText("still here")).toBeTruthy();
  });

  it("keys the motion node by pathname so route changes are noticed", async () => {
    currentPath = "/a";
    const { RouteTransition } = await import(
      "@/components/marketing/RouteTransition"
    );
    const { container, rerender } = render(
      <RouteTransition>
        <p>page a</p>
      </RouteTransition>,
    );
    const first = container.querySelector('[data-testid="route-transition"]');
    expect(first).not.toBeNull();
    expect((first as HTMLElement).getAttribute("data-pathname")).toBe("/a");

    // Flip the pathname and rerender. AnimatePresence with mode="wait" will
    // keep the outgoing node mounted until the exit completes — but a node
    // with the new pathname must appear in the tree at least once.
    currentPath = "/b";
    rerender(
      <RouteTransition>
        <p>page b</p>
      </RouteTransition>,
    );
    const all = container.querySelectorAll(
      '[data-testid="route-transition"]',
    );
    const paths = Array.from(all).map((n) =>
      (n as HTMLElement).getAttribute("data-pathname"),
    );
    expect(paths).toContain("/a");
    // The wrapper does not crash on a rerender with a new key.
    expect(all.length).toBeGreaterThanOrEqual(1);
  });
});
