import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  ScrollSection,
  RevealStack,
  RevealItem,
} from "@/components/marketing/ScrollSection";

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

describe("ScrollSection", () => {
  beforeEach(() => {
    setReducedMotion(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children", () => {
    const { getByText } = render(
      <ScrollSection>
        <p>hello world</p>
      </ScrollSection>,
    );
    expect(getByText("hello world")).toBeTruthy();
  });

  it("applies the default 40px border radius to the inner panel", () => {
    const { container } = render(
      <ScrollSection>
        <p>body</p>
      </ScrollSection>,
    );
    const panel = container.querySelector("section > div > div");
    expect(panel).not.toBeNull();
    const style = (panel as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("border-radius: 40px");
  });

  it("respects a custom radius", () => {
    const { container } = render(
      <ScrollSection radius={24}>
        <p>body</p>
      </ScrollSection>,
    );
    const panel = container.querySelector("section > div > div");
    expect(panel).not.toBeNull();
    const style = (panel as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("border-radius: 24px");
  });

  it("exposes ariaLabel via aria-label on the section", () => {
    const { container } = render(
      <ScrollSection ariaLabel="Stop drawing">
        <p>body</p>
      </ScrollSection>,
    );
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section!.getAttribute("aria-label")).toBe("Stop drawing");
  });

  it("passes id through for in-page anchors", () => {
    const { container } = render(
      <ScrollSection id="describe">
        <p>body</p>
      </ScrollSection>,
    );
    const section = container.querySelector("#describe");
    expect(section).not.toBeNull();
  });

  it("applies tone classes", () => {
    const { container } = render(
      <ScrollSection tone="inverse">
        <p>body</p>
      </ScrollSection>,
    );
    const panel = container.querySelector("section > div > div");
    expect(panel).not.toBeNull();
    expect((panel as HTMLElement).className).toContain("text-white");
  });

  it("RevealStack + RevealItem render their children even with reduced motion", () => {
    const { getByText } = render(
      <ScrollSection>
        <RevealStack>
          <RevealItem as="h2">Headline</RevealItem>
          <RevealItem as="p">Body copy here.</RevealItem>
        </RevealStack>
      </ScrollSection>,
    );
    expect(getByText("Headline")).toBeTruthy();
    expect(getByText("Body copy here.")).toBeTruthy();
  });
});
