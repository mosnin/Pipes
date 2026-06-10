import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import customerSupportFixture from "../fixtures/agent-build/playground-customer-support.json";

// xyflow + the playground need ResizeObserver and matchMedia. jsdom ships
// neither. Install them at module load so the tests see them before any
// component module imports run.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
    ResizeObserverMock;
}

const installMatchMedia = () => {
  // Always return matches: true for reduce-motion so the replay runs with
  // zero delay between frames; the test completes in milliseconds.
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};
installMatchMedia();

// The component imports xyflow which touches the DOM, so we lazy-import it
// after the shims are in place.
const { PlaygroundEditor, PLAYGROUND_STARTERS } = await import(
  "@/app/(marketing)/play/PlaygroundEditor"
);

beforeEach(() => {
  installMatchMedia();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function installFixtureFetch(fixture: unknown) {
  const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
    if (typeof url === "string" && url.includes("/playground-fixtures/")) {
      return new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch: ${String(url)}`);
  });
  (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch;
  return fetchSpy;
}

describe("PlaygroundEditor", () => {
  it("renders the hero, three starter chips, and the conversation strip", () => {
    installFixtureFetch(customerSupportFixture);
    render(<PlaygroundEditor />);

    // The headline is verbatim from the docs.
    expect(screen.getByRole("heading", { level: 1, name: /describe your system/i })).toBeTruthy();

    // Three starter chips by data-testid.
    for (const starter of PLAYGROUND_STARTERS) {
      const chip = screen.getByTestId(`playground-starter-${starter.key}`);
      expect(chip).toBeTruthy();
      expect(chip.textContent).toContain(starter.label);
    }

    // Conversation strip is always visible.
    expect(screen.getByTestId("playground-conversation")).toBeTruthy();

    // The canvas placeholder renders before any chip is clicked.
    expect(screen.getByTestId("playground-canvas")).toBeTruthy();
    expect(screen.getByText(/pick a starter above\./i)).toBeTruthy();
  });

  it("clicking a starter replays the local fixture and lands nodes on the canvas", async () => {
    const fetchSpy = installFixtureFetch(customerSupportFixture);
    render(<PlaygroundEditor />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("playground-starter-customer-support"));
    });

    // Hit exactly one fixture URL; no agent build API call.
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
    const calledUrls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(calledUrls.some((u) => u.includes("/playground-fixtures/customer-support.json"))).toBe(true);
    expect(calledUrls.some((u) => u.includes("/api/agent/build"))).toBe(false);

    // The user prompt lands in the conversation strip immediately.
    await waitFor(() => {
      expect(screen.getByText(/intake, classify, escalate/i)).toBeTruthy();
    });

    // With prefers-reduced-motion mocked to TRUE, the loop has zero delay
    // between frames, so the run finishes quickly. Wait for the after-build
    // affordance to appear.
    await waitFor(
      () => {
        expect(screen.getByTestId("playground-after-build")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // The after-build CTA links to the signup route with the playground source.
    const cta = screen.getByTestId("playground-signup-cta") as HTMLAnchorElement;
    expect(cta.getAttribute("href")).toContain("/signup?source=playground");
    expect(cta.getAttribute("href")).toContain("starter=customer-support");

    // The try-another affordance resets.
    fireEvent.click(screen.getByTestId("playground-try-another"));
    await waitFor(() => {
      expect(screen.queryByTestId("playground-after-build")).toBeNull();
      expect(screen.getByText(/pick a starter above\./i)).toBeTruthy();
    });
  });

  it("does not call /api/agent/build at any point", async () => {
    const fetchSpy = installFixtureFetch(customerSupportFixture);
    render(<PlaygroundEditor />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("playground-starter-customer-support"));
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("playground-after-build")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    for (const u of urls) {
      expect(u.includes("/api/agent/build")).toBe(false);
      expect(u.includes("/api/graph")).toBe(false);
    }
  });
});
