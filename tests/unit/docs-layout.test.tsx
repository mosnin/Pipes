import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { DocsLayout } from "@/components/marketing/DocsLayout";
import { DocsSection, DocsHeading } from "@/components/marketing/DocsSection";
import { DocsCodeBlock } from "@/components/marketing/DocsCodeBlock";
import { DocsCallout } from "@/components/marketing/DocsCallout";
import { DocsSidebar } from "@/components/marketing/DocsSidebar";
import { DocsRightRail } from "@/components/marketing/DocsRightRail";
import type { DocsNavCategory } from "@/components/marketing/DocsSidebar";
import type { DocsRailHeading } from "@/components/marketing/DocsRightRail";

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

// jsdom doesn't ship IntersectionObserver
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

const CATEGORIES: ReadonlyArray<DocsNavCategory> = [
  {
    title: "Getting started",
    items: [
      { id: "quickstart", label: "Quickstart" },
      { id: "mental-model", label: "Mental model" },
    ],
  },
  {
    title: "Protocol",
    items: [{ id: "protocol-overview", label: "MCP overview" }],
  },
];

const HEADINGS: ReadonlyArray<DocsRailHeading> = [
  { id: "quickstart", label: "Quickstart", level: 2 },
  { id: "mental-model", label: "Mental model", level: 2 },
  { id: "protocol-overview", label: "MCP overview", level: 2 },
];

describe("DocsLayout", () => {
  beforeEach(() => {
    fakeMatchMedia(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the three-column structure with sidebar, main, and right rail", () => {
    const { container, getByRole } = render(
      <DocsLayout
        categories={CATEGORIES}
        headings={HEADINGS}
        header={<h1>Docs</h1>}
      >
        <DocsSection id="quickstart" title="Quickstart">
          <p>Body</p>
        </DocsSection>
      </DocsLayout>,
    );
    // Sidebar nav + right rail nav + mobile-trigger row -> at least 2 nav landmarks
    const navs = container.querySelectorAll('nav[aria-label]');
    expect(navs.length).toBeGreaterThanOrEqual(2);
    // The article wraps the main column
    expect(getByRole("article")).toBeTruthy();
  });

  it("renders a reading progress bar pinned to the top", () => {
    const { container } = render(
      <DocsLayout
        categories={CATEGORIES}
        headings={HEADINGS}
        header={<h1>Docs</h1>}
      >
        <p>Body</p>
      </DocsLayout>,
    );
    const bar = container.querySelector(".fixed.top-0.left-0.right-0");
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
  });

  it("hides the right rail on small screens", () => {
    const { container } = render(
      <DocsLayout
        categories={CATEGORIES}
        headings={HEADINGS}
        header={<h1>Docs</h1>}
      >
        <p>Body</p>
      </DocsLayout>,
    );
    const asides = container.querySelectorAll("aside");
    // Both the sidebar and the right rail are hidden lg:block
    for (const aside of Array.from(asides)) {
      expect(aside.className).toContain("hidden");
      expect(aside.className).toContain("lg:block");
    }
  });

  it("exposes a 'Browse' trigger on mobile", () => {
    const { getByLabelText } = render(
      <DocsLayout
        categories={CATEGORIES}
        headings={HEADINGS}
        header={<h1>Docs</h1>}
      >
        <p>Body</p>
      </DocsLayout>,
    );
    const trigger = getByLabelText("Open docs navigation");
    expect(trigger).toBeTruthy();
  });

  it("opens the mobile drawer when 'Browse' is clicked", () => {
    const { getByLabelText, queryByTestId } = render(
      <DocsLayout
        categories={CATEGORIES}
        headings={HEADINGS}
        header={<h1>Docs</h1>}
      >
        <p>Body</p>
      </DocsLayout>,
    );
    expect(queryByTestId("docs-mobile-drawer")).toBeNull();
    fireEvent.click(getByLabelText("Open docs navigation"));
    expect(queryByTestId("docs-mobile-drawer")).not.toBeNull();
  });
});

describe("DocsSection", () => {
  it("renders an h2 with the section id as the anchor", () => {
    const { container } = render(
      <DocsSection id="quickstart" title="Quickstart">
        <p>Body</p>
      </DocsSection>,
    );
    const h2 = container.querySelector("h2#quickstart");
    expect(h2).not.toBeNull();
    expect(h2?.textContent).toContain("Quickstart");
  });

  it("DocsHeading exposes a copy-anchor button", () => {
    const { container } = render(
      <DocsHeading id="hello" level={3}>
        Hello
      </DocsHeading>,
    );
    const btn = container.querySelector('button[aria-label="Copy anchor link"]');
    expect(btn).not.toBeNull();
  });
});

describe("DocsSidebar", () => {
  it("renders all categories and items", () => {
    const { getByText } = render(
      <DocsSidebar categories={CATEGORIES} activeId="quickstart" />,
    );
    expect(getByText("Getting started")).toBeTruthy();
    expect(getByText("Quickstart")).toBeTruthy();
    expect(getByText("Mental model")).toBeTruthy();
    expect(getByText("Protocol")).toBeTruthy();
  });

  it("marks the active item with data-active='true'", () => {
    const { container } = render(
      <DocsSidebar categories={CATEGORIES} activeId="mental-model" />,
    );
    const active = container.querySelector('a[data-active="true"]');
    expect(active).not.toBeNull();
    expect(active?.textContent).toBe("Mental model");
  });

  it("filters by the search query", () => {
    const { getByLabelText, queryByText, getByText } = render(
      <DocsSidebar categories={CATEGORIES} activeId={null} />,
    );
    const input = getByLabelText("Filter docs sections") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "mcp" } });
    expect(getByText("MCP overview")).toBeTruthy();
    expect(queryByText("Quickstart")).toBeNull();
  });
});

describe("DocsRightRail", () => {
  it("renders all headings", () => {
    const { getByText, getByLabelText } = render(
      <DocsRightRail headings={HEADINGS} activeId="quickstart" />,
    );
    expect(getByLabelText("On this page")).toBeTruthy();
    expect(getByText("Quickstart")).toBeTruthy();
    expect(getByText("Mental model")).toBeTruthy();
    expect(getByText("MCP overview")).toBeTruthy();
  });
});

describe("DocsCodeBlock", () => {
  it("renders code and a language pill", () => {
    const { container, getByText } = render(
      <DocsCodeBlock language="ts" code={`const x = 1;`} />,
    );
    expect(getByText("ts")).toBeTruthy();
    expect(container.querySelector("pre")).not.toBeNull();
  });

  it("highlights TypeScript keywords", () => {
    const { container } = render(
      <DocsCodeBlock language="ts" code={`const x = 1;`} />,
    );
    const purple = container.querySelector("span.text-\\[\\#9333EA\\]");
    expect(purple?.textContent).toBe("const");
  });

  it("highlights JSON keys and strings differently", () => {
    const { container } = render(
      <DocsCodeBlock language="json" code={`{"name": "pipes"}`} />,
    );
    // Property key (blue)
    const key = container.querySelector("span.text-\\[\\#2563EB\\]");
    expect(key?.textContent).toBe('"name"');
  });

  it("renders a copy button labeled 'Copy code'", () => {
    const { container } = render(
      <DocsCodeBlock language="bash" code={`ls -la`} />,
    );
    const btn = container.querySelector('button[aria-label="Copy code"]');
    expect(btn).not.toBeNull();
  });

  it("renders a filename header when one is provided", () => {
    const { getByText } = render(
      <DocsCodeBlock language="ts" code={`x`} filename="tools.ts" />,
    );
    expect(getByText("tools.ts")).toBeTruthy();
  });
});

describe("DocsCallout", () => {
  it("renders the default Note title for info tone", () => {
    const { getByText } = render(
      <DocsCallout tone="info">
        <p>Read this</p>
      </DocsCallout>,
    );
    expect(getByText("Note")).toBeTruthy();
    expect(getByText("Read this")).toBeTruthy();
  });

  it("uses the provided title", () => {
    const { getByText } = render(
      <DocsCallout tone="warning" title="Heads up">
        body
      </DocsCallout>,
    );
    expect(getByText("Heads up")).toBeTruthy();
  });

  it("includes an aria-label on the note region", () => {
    const { container } = render(
      <DocsCallout tone="tip" title="Pro tip">
        body
      </DocsCallout>,
    );
    const note = container.querySelector('div[role="note"]');
    expect(note?.getAttribute("aria-label")).toBe("Pro tip");
  });

  it("uses no lucide icons in the glyph", () => {
    const { container } = render(
      <DocsCallout tone="info">body</DocsCallout>,
    );
    // The glyph is a hand-rolled SVG with viewBox 0 0 16 16
    const svg = container.querySelector('svg[viewBox="0 0 16 16"]');
    expect(svg).not.toBeNull();
  });
});
