import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import type { ProtocolCodeSample } from "@/components/marketing/ProtocolCodeTabs";

/**
 * ProtocolCodeTabs tests
 *
 * Force prefers-reduced-motion: reduce so the AnimatePresence cross-fade
 * resolves synchronously. Stub IntersectionObserver because framer-motion
 * uses it under the hood.
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

const SAMPLES: ReadonlyArray<ProtocolCodeSample> = [
  { id: "typescript", label: "TypeScript", code: "const x = 1;" },
  { id: "python", label: "Python", code: "x = 1" },
  { id: "bash", label: "cURL", code: "curl https://example.com" },
  { id: "json", label: "Claude Desktop", code: '{ "k": "v" }' },
];

describe("ProtocolCodeTabs", () => {
  beforeEach(() => {
    setReducedMotion(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all four language tabs", async () => {
    const { ProtocolCodeTabs } = await import(
      "@/components/marketing/ProtocolCodeTabs"
    );
    const { container } = render(<ProtocolCodeTabs samples={SAMPLES} />);
    for (const sample of SAMPLES) {
      const tab = container.querySelector(`[data-testid="protocol-tab-${sample.id}"]`);
      expect(tab).not.toBeNull();
      expect(tab!.textContent).toContain(sample.label);
    }
  });

  it("starts with the first sample selected", async () => {
    const { ProtocolCodeTabs } = await import(
      "@/components/marketing/ProtocolCodeTabs"
    );
    const { container } = render(<ProtocolCodeTabs samples={SAMPLES} />);
    const tab = container.querySelector(
      '[data-testid="protocol-tab-typescript"]',
    );
    expect(tab).not.toBeNull();
    expect(tab!.getAttribute("aria-selected")).toBe("true");
  });

  it("switches the active tab when a different language is clicked", async () => {
    const { ProtocolCodeTabs } = await import(
      "@/components/marketing/ProtocolCodeTabs"
    );
    const { container } = render(<ProtocolCodeTabs samples={SAMPLES} />);
    const pythonTab = container.querySelector(
      '[data-testid="protocol-tab-python"]',
    ) as HTMLElement | null;
    expect(pythonTab).not.toBeNull();
    fireEvent.click(pythonTab!);
    expect(pythonTab!.getAttribute("aria-selected")).toBe("true");
    const tsTab = container.querySelector(
      '[data-testid="protocol-tab-typescript"]',
    );
    expect(tsTab!.getAttribute("aria-selected")).toBe("false");
  });

  it("renders syntax-highlighted code for the active sample", async () => {
    const { ProtocolCodeTabs } = await import(
      "@/components/marketing/ProtocolCodeTabs"
    );
    const { container } = render(<ProtocolCodeTabs samples={SAMPLES} />);
    const highlighted = container.querySelector(
      '[data-testid="protocol-code-highlighted"]',
    );
    expect(highlighted).not.toBeNull();
    expect(highlighted!.textContent).toContain("const");
  });

  it("renders a copy button labeled Copy", async () => {
    const { ProtocolCodeTabs } = await import(
      "@/components/marketing/ProtocolCodeTabs"
    );
    const { container } = render(<ProtocolCodeTabs samples={SAMPLES} />);
    const copy = container.querySelector(
      '[data-testid="protocol-code-copy"]',
    );
    expect(copy).not.toBeNull();
    expect(copy!.textContent).toContain("Copy");
  });

  it("the copy button flips to Copied on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { ProtocolCodeTabs } = await import(
      "@/components/marketing/ProtocolCodeTabs"
    );
    const { container } = render(<ProtocolCodeTabs samples={SAMPLES} />);
    const copy = container.querySelector(
      '[data-testid="protocol-code-copy"]',
    ) as HTMLElement | null;
    expect(copy).not.toBeNull();
    fireEvent.click(copy!);
    expect(writeText).toHaveBeenCalledWith("const x = 1;");
    expect(copy!.textContent).toContain("Copied");
  });
});
