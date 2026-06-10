import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { TryItFloatingWidget } from "@/components/marketing/TryItFloatingWidget";

// jsdom doesn't ship IntersectionObserver; the widget itself doesn't use it
// (the embedded canvas inside the dialog does, but the dialog isn't opened
// during these tests). Provide a noop just in case anything internal touches
// it on import.
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
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("TryItFloatingWidget", () => {
  it("renders a fixed bottom-right trigger button by default", () => {
    render(<TryItFloatingWidget />);
    const root = screen.getByTestId("try-it-floating-root");
    expect(root).toBeTruthy();
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("bottom-6");
    expect(root.className).toContain("right-6");
    const trigger = screen.getByTestId("try-it-trigger");
    expect(trigger.getAttribute("aria-label")).toContain("Try");
  });

  it("renders the larger 48px circle on first visit and shrinks on subsequent visits", () => {
    const { unmount } = render(<TryItFloatingWidget />);
    const first = screen.getByTestId("try-it-trigger");
    expect(first.getAttribute("data-seen")).toBe("0");
    expect(first.getAttribute("style")).toContain("48px");

    // Simulate a previous session that already saw the widget.
    window.localStorage.setItem("pipes-try-it-collapsed-seen", "1");
    unmount();

    render(<TryItFloatingWidget />);
    const second = screen.getByTestId("try-it-trigger");
    expect(second.getAttribute("data-seen")).toBe("1");
    expect(second.getAttribute("style")).toContain("40px");
  });

  it("shows the 'Try it' tooltip on hover", () => {
    render(<TryItFloatingWidget />);
    const trigger = screen.getByTestId("try-it-trigger");
    fireEvent.mouseEnter(trigger);
    const tooltip = screen.getByTestId("try-it-tooltip");
    expect(tooltip.textContent).toBe("Try it");
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByTestId("try-it-tooltip")).toBeNull();
  });

  it("opens the slim playground dialog on click and records the seen flag", () => {
    render(<TryItFloatingWidget />);
    expect(window.localStorage.getItem("pipes-try-it-collapsed-seen")).toBeNull();
    const trigger = screen.getByTestId("try-it-trigger");
    act(() => {
      fireEvent.click(trigger);
    });
    // Slim playground is rendered inside the dialog portal.
    const playground = screen.getByTestId("try-it-slim-playground");
    expect(playground).toBeTruthy();
    // Three starter chips are present.
    expect(screen.getByTestId("try-it-chip-customer-support")).toBeTruthy();
    expect(screen.getByTestId("try-it-chip-code-review")).toBeTruthy();
    expect(screen.getByTestId("try-it-chip-lead-qualifier")).toBeTruthy();
    // The seen flag is persisted.
    expect(window.localStorage.getItem("pipes-try-it-collapsed-seen")).toBe("1");
  });

  it("closes the dialog when the close button is clicked", () => {
    render(<TryItFloatingWidget />);
    act(() => {
      fireEvent.click(screen.getByTestId("try-it-trigger"));
    });
    expect(screen.getByTestId("try-it-slim-playground")).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByTestId("try-it-close"));
    });
    expect(screen.queryByTestId("try-it-slim-playground")).toBeNull();
  });

  it("closes on Escape", () => {
    render(<TryItFloatingWidget />);
    act(() => {
      fireEvent.click(screen.getByTestId("try-it-trigger"));
    });
    expect(screen.getByTestId("try-it-slim-playground")).toBeTruthy();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByTestId("try-it-slim-playground")).toBeNull();
  });
});
