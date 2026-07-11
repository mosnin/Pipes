import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MobileGate } from "@/components/mobile/MobileGate";
import { DesktopFirstBanner } from "@/components/mobile/DesktopFirstBanner";

// Helper to set window.innerWidth and dispatch a resize event so the hook
// inside MobileGate picks up the new value.
function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

describe("MobileGate", () => {
  beforeEach(() => {
    setViewportWidth(1280);
  });

  afterEach(() => {
    try {
      localStorage.removeItem("pipes-mobile-warning-dismissed");
    } catch {
      // ignore
    }
  });

  it("renders the desktop children when viewport is wide", () => {
    setViewportWidth(1280);
    render(
      <MobileGate mobile={<div>mobile-branch</div>}>
        <div>desktop-branch</div>
      </MobileGate>,
    );
    expect(screen.getByText("desktop-branch")).toBeTruthy();
    expect(screen.queryByText("mobile-branch")).toBeNull();
  });

  it("swaps to the mobile branch under the breakpoint", () => {
    setViewportWidth(1280);
    render(
      <MobileGate mobile={<div>mobile-branch</div>}>
        <div>desktop-branch</div>
      </MobileGate>,
    );
    setViewportWidth(420);
    expect(screen.getByText("mobile-branch")).toBeTruthy();
    expect(screen.queryByText("desktop-branch")).toBeNull();
  });

  it("uses the custom breakpoint when provided", () => {
    setViewportWidth(900);
    render(
      <MobileGate mobile={<div>mobile-branch</div>} breakpoint={1024}>
        <div>desktop-branch</div>
      </MobileGate>,
    );
    expect(screen.getByText("mobile-branch")).toBeTruthy();
  });
});

describe("DesktopFirstBanner", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("pipes-mobile-warning-dismissed");
    } catch {
      // ignore
    }
  });

  it("renders the desktop-first message on first visit", async () => {
    render(<DesktopFirstBanner />);
    // The banner hydrates from localStorage in an effect; wait for it.
    expect(await screen.findByText(/Pipes is built for desktop/i)).toBeTruthy();
  });

  it("persists the dismissal and stays hidden after re-render", async () => {
    const { unmount } = render(<DesktopFirstBanner />);
    const dismiss = await screen.findByRole("button", { name: /dismiss/i });
    act(() => {
      dismiss.click();
    });
    expect(screen.queryByText(/Pipes is built for desktop/i)).toBeNull();
    expect(localStorage.getItem("pipes-mobile-warning-dismissed")).toBe("1");
    unmount();
    render(<DesktopFirstBanner />);
    // Even after the effect runs, the banner should remain hidden because the
    // dismissal flag is persisted.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText(/Pipes is built for desktop/i)).toBeNull();
  });
});
