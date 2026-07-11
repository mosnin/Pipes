import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UseCaseStorySection } from "@/components/marketing/UseCaseStorySection";

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

describe("UseCaseStorySection", () => {
  it("renders the title", () => {
    render(
      <UseCaseStorySection title="The challenge">
        <p>Body text</p>
      </UseCaseStorySection>,
    );
    expect(screen.getByText("The challenge")).toBeTruthy();
  });

  it("renders the eyebrow when provided", () => {
    render(
      <UseCaseStorySection eyebrow="Story" title="The challenge">
        <p>Body text</p>
      </UseCaseStorySection>,
    );
    expect(screen.getByText("Story")).toBeTruthy();
  });

  it("renders its children", () => {
    render(
      <UseCaseStorySection title="The result">
        <p>Three days from sketch to ship.</p>
      </UseCaseStorySection>,
    );
    expect(
      screen.getByText("Three days from sketch to ship."),
    ).toBeTruthy();
  });

  it("uses an h2 for the title", () => {
    render(
      <UseCaseStorySection title="How they built it">
        <p>Body</p>
      </UseCaseStorySection>,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("How they built it");
  });

  it("applies an id attribute when provided", () => {
    const { container } = render(
      <UseCaseStorySection id="custom-id" title="Section">
        <p>Body</p>
      </UseCaseStorySection>,
    );
    expect(container.querySelector("#custom-id")).not.toBeNull();
  });

  it("renders the section landmark for screen readers", () => {
    const { container } = render(
      <UseCaseStorySection title="Section">
        <p>Body</p>
      </UseCaseStorySection>,
    );
    expect(
      container.querySelector('[data-testid="use-case-story-section"]'),
    ).not.toBeNull();
  });
});
