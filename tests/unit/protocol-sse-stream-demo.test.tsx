import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

/**
 * ProtocolSseStreamDemo tests
 *
 * Under reduced motion the stream collapses to its final state immediately:
 * all events are emitted and visible. We assert the structure and the
 * presence of every event type called out in the agent contract.
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

class StubIntersectionObserver {
  constructor(_cb: IntersectionObserverCallback) {
    void _cb;
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

describe("ProtocolSseStreamDemo", () => {
  beforeEach(() => {
    setReducedMotion(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the outer demo container", async () => {
    const { ProtocolSseStreamDemo } = await import(
      "@/components/marketing/ProtocolSseStreamDemo"
    );
    const { container } = render(<ProtocolSseStreamDemo />);
    const root = container.querySelector(
      '[data-testid="protocol-sse-stream-demo"]',
    );
    expect(root).not.toBeNull();
  });

  it("renders the stream events region", async () => {
    const { ProtocolSseStreamDemo } = await import(
      "@/components/marketing/ProtocolSseStreamDemo"
    );
    const { container } = render(<ProtocolSseStreamDemo />);
    const region = container.querySelector(
      '[data-testid="protocol-sse-stream-events"]',
    );
    expect(region).not.toBeNull();
  });

  it("under reduced motion, shows every event type from the agent contract", async () => {
    const { ProtocolSseStreamDemo } = await import(
      "@/components/marketing/ProtocolSseStreamDemo"
    );
    const { container } = render(<ProtocolSseStreamDemo />);
    const events = container.querySelectorAll("[data-event-name]");
    const names = new Set(
      Array.from(events).map((el) => el.getAttribute("data-event-name")),
    );
    // The fixture exercises status, tool_call, tool_result, message, done.
    for (const name of ["status", "tool_call", "tool_result", "message", "done"]) {
      expect(names.has(name)).toBe(true);
    }
  });

  it("renders the request line for POST /api/agent/build", async () => {
    const { ProtocolSseStreamDemo } = await import(
      "@/components/marketing/ProtocolSseStreamDemo"
    );
    const { container } = render(<ProtocolSseStreamDemo />);
    expect(container.textContent ?? "").toContain("POST /api/agent/build");
  });

  it("renders multiple tool_call events to demonstrate ordering", async () => {
    const { ProtocolSseStreamDemo } = await import(
      "@/components/marketing/ProtocolSseStreamDemo"
    );
    const { container } = render(<ProtocolSseStreamDemo />);
    const toolCalls = container.querySelectorAll(
      '[data-event-name="tool_call"]',
    );
    expect(toolCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("under reduced motion, the progress count shows all events", async () => {
    const { ProtocolSseStreamDemo } = await import(
      "@/components/marketing/ProtocolSseStreamDemo"
    );
    const { container } = render(<ProtocolSseStreamDemo />);
    // The footer reads "N / N events" once the stream completes.
    const text = container.textContent ?? "";
    expect(/(\d+)\s*\/\s*\1\s*events/.test(text)).toBe(true);
  });
});
