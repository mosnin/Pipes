import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { EmbeddedCanvas } from "@/components/marketing/EmbeddedCanvas";

// jsdom doesn't ship IntersectionObserver. The onView mode depends on it,
// so we install a controllable stub. Tests that need the canvas to start
// immediately use autoplay="onMount" instead.
class NoopIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

beforeEach(() => {
  (
    globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }
  ).IntersectionObserver = NoopIntersectionObserver as unknown as typeof IntersectionObserver;

  // matchMedia for useReducedMotion (return non-matching by default).
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock the fixture fetch so tests don't depend on next public/.
  vi.spyOn(global, "fetch").mockImplementation(async () => {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EmbeddedCanvas", () => {
  it("renders an outer wrapper carrying the template id", () => {
    render(<EmbeddedCanvas templateId="multi-agent-handoff" autoplay="onClick" />);
    const wrap = screen.getByTestId("embedded-canvas");
    expect(wrap.getAttribute("data-template-id")).toBe("multi-agent-handoff");
  });

  it("shows a 'Run this starter' overlay in onClick mode", () => {
    render(<EmbeddedCanvas templateId="multi-agent-handoff" autoplay="onClick" />);
    const btn = screen.getByTestId("embedded-canvas-run");
    expect(btn.textContent).toContain("Run this starter");
  });

  it("hides the overlay after the user clicks Run", () => {
    render(<EmbeddedCanvas templateId="multi-agent-handoff" autoplay="onClick" />);
    const btn = screen.getByTestId("embedded-canvas-run");
    act(() => {
      fireEvent.click(btn);
    });
    expect(screen.queryByTestId("embedded-canvas-run")).toBeNull();
  });

  it("renders nothing-but-message when the template id is unknown", () => {
    render(<EmbeddedCanvas templateId="does-not-exist" autoplay="onClick" />);
    expect(screen.getByText("Preview unavailable")).toBeTruthy();
  });

  it("auto-completes immediately when reduced motion is preferred", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("reduce"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    const onComplete = vi.fn();
    render(
      <EmbeddedCanvas
        templateId="multi-agent-handoff"
        autoplay="onMount"
        onComplete={onComplete}
      />,
    );
    await waitFor(() => {
      const wrap = screen.getByTestId("embedded-canvas");
      expect(wrap.getAttribute("data-done")).toBe("1");
    });
    expect(onComplete).toHaveBeenCalled();
  });
});
