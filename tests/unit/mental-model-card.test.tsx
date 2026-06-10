import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MentalModelCard } from "@/components/MentalModelCard";
import { KEYS } from "@/lib/feedback/storage";

// ---------------------------------------------------------------------------
// Tests for the one-shot mental model card.
// Verifies: renders three screens with pagination dots, dismissal via Skip,
// Esc, click-outside, and "Got it" all persist the seen flag, and the card
// never re-renders after dismissal (across a simulated reload).
// ---------------------------------------------------------------------------

describe("MentalModelCard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the first screen when the seen flag is unset", () => {
    render(<MentalModelCard />);
    expect(
      screen.getByText("A node is one step in your system."),
    ).toBeTruthy();
  });

  it("does not render when the seen flag is set", () => {
    window.localStorage.setItem(KEYS.MENTAL_MODEL_SEEN, "true");
    render(<MentalModelCard />);
    expect(
      screen.queryByText("A node is one step in your system."),
    ).toBeNull();
  });

  it("renders three pagination dots for three screens", () => {
    render(<MentalModelCard />);
    const dots = screen.getAllByRole("tab");
    expect(dots).toHaveLength(3);
  });

  it("advances through three screens via the Next button and persists on Got it", () => {
    render(<MentalModelCard />);

    expect(
      screen.getByText("A node is one step in your system."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByText("A connection is the flow between two steps."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Describe it. The agent draws it.")).toBeTruthy();

    // Final button reads "Got it" and persists the seen flag.
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(window.localStorage.getItem(KEYS.MENTAL_MODEL_SEEN)).toBe("true");
    expect(
      screen.queryByText("Describe it. The agent draws it."),
    ).toBeNull();
  });

  it("Back button returns to the previous screen", () => {
    render(<MentalModelCard />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByText("A connection is the flow between two steps."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByText("A node is one step in your system."),
    ).toBeTruthy();
  });

  it("Skip link persists the seen flag and closes the card", () => {
    render(<MentalModelCard />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(window.localStorage.getItem(KEYS.MENTAL_MODEL_SEEN)).toBe("true");
    expect(
      screen.queryByText("A node is one step in your system."),
    ).toBeNull();
  });

  it("close X persists the seen flag and closes the card", () => {
    render(<MentalModelCard />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(window.localStorage.getItem(KEYS.MENTAL_MODEL_SEEN)).toBe("true");
    expect(
      screen.queryByText("A node is one step in your system."),
    ).toBeNull();
  });

  it("Escape key persists the seen flag and closes the card", () => {
    render(<MentalModelCard />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(window.localStorage.getItem(KEYS.MENTAL_MODEL_SEEN)).toBe("true");
    expect(
      screen.queryByText("A node is one step in your system."),
    ).toBeNull();
  });

  it("click outside the dialog persists the seen flag and closes", () => {
    render(<MentalModelCard />);
    // The role="presentation" backdrop holds the click-outside handler.
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as HTMLElement);
    expect(window.localStorage.getItem(KEYS.MENTAL_MODEL_SEEN)).toBe("true");
    expect(
      screen.queryByText("A node is one step in your system."),
    ).toBeNull();
  });

  it("never re-renders after dismissal across a simulated reload", () => {
    const first = render(<MentalModelCard />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(window.localStorage.getItem(KEYS.MENTAL_MODEL_SEEN)).toBe("true");
    first.unmount();

    // Simulate a fresh page load. The flag persists in localStorage; the
    // card must not re-render.
    const second = render(<MentalModelCard />);
    expect(
      second.container.querySelector('[role="dialog"]'),
    ).toBeNull();
  });

  it("clicking a pagination dot jumps to that screen", () => {
    render(<MentalModelCard />);
    const dots = screen.getAllByRole("tab");
    fireEvent.click(dots[2]);
    expect(screen.getByText("Describe it. The agent draws it.")).toBeTruthy();
  });
});
