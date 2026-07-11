import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollSpy, smoothScrollToId } from "@/lib/marketing/useScrollSpy";

function fakeMatchMedia(reduce: boolean): void {
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

function mountHeadings(ids: string[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const id of ids) {
    const h = document.createElement("h2");
    h.id = id;
    h.textContent = id;
    document.body.appendChild(h);
    out.push(h);
  }
  return out;
}

function setRect(el: HTMLElement, top: number): void {
  el.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + 30,
      left: 0,
      right: 0,
      width: 100,
      height: 30,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("useScrollSpy", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    fakeMatchMedia(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to the first id when no heading has crossed the threshold", () => {
    const [a, b] = mountHeadings(["a", "b"]);
    setRect(a, 400);
    setRect(b, 800);
    const { result } = renderHook(() => useScrollSpy(["a", "b"], 100));
    expect(result.current).toBe("a");
  });

  it("picks the most recently crossed heading", () => {
    const [a, b, c] = mountHeadings(["a", "b", "c"]);
    setRect(a, -300);
    setRect(b, -50);
    setRect(c, 400);
    const { result } = renderHook(() => useScrollSpy(["a", "b", "c"], 100));
    // b.top (-50) - 100 = -150 <= 0, and b.top > a.top, so b wins
    expect(result.current).toBe("b");
  });

  it("updates as the user scrolls", async () => {
    const [a, b] = mountHeadings(["a", "b"]);
    setRect(a, 200);
    setRect(b, 1000);
    const { result } = renderHook(() => useScrollSpy(["a", "b"], 100));
    expect(result.current).toBe("a");

    // Simulate scroll: b moves into the trigger zone
    setRect(a, -1000);
    setRect(b, 50);
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      // Wait two rAFs so the rAF-batched compute and the React state flush both land
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    expect(result.current).toBe("b");
  });

  it("returns the last id once the user has scrolled past all headings", () => {
    const [a, b] = mountHeadings(["a", "b"]);
    setRect(a, -800);
    setRect(b, -400);
    const { result } = renderHook(() => useScrollSpy(["a", "b"], 100));
    expect(result.current).toBe("b");
  });

  it("returns null when no ids are provided", () => {
    const { result } = renderHook(() => useScrollSpy([], 100));
    expect(result.current).toBe(null);
  });
});

describe("smoothScrollToId", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    fakeMatchMedia(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls window.scrollTo with the offset applied", () => {
    const h = document.createElement("h2");
    h.id = "target";
    document.body.appendChild(h);
    setRect(h, 300);
    Object.defineProperty(window, "scrollY", { value: 100, writable: true });
    const spy = vi.spyOn(window, "scrollTo");
    smoothScrollToId("target", 80);
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0][0] as ScrollToOptions;
    // 100 + 300 - 80 = 320
    expect(arg.top).toBe(320);
    expect(arg.behavior).toBe("smooth");
  });

  it("uses auto behavior under prefers-reduced-motion", () => {
    fakeMatchMedia(true);
    const h = document.createElement("h2");
    h.id = "target";
    document.body.appendChild(h);
    setRect(h, 200);
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    const spy = vi.spyOn(window, "scrollTo");
    smoothScrollToId("target", 80);
    const arg = spy.mock.calls[0][0] as ScrollToOptions;
    expect(arg.behavior).toBe("auto");
  });

  it("is a no-op when the target id does not exist", () => {
    const spy = vi.spyOn(window, "scrollTo");
    smoothScrollToId("missing", 80);
    expect(spy).not.toHaveBeenCalled();
  });
});
