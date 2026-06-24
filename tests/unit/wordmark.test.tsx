import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmark } from "@/components/Wordmark";

describe("Wordmark", () => {
  it("renders 'Looper' as accessible text", () => {
    render(<Wordmark />);
    const root = screen.getByTestId("wordmark");
    expect(root).toBeTruthy();
    expect(root.textContent).toContain("Looper");
  });

  it("uses ASCII-safe characters only", () => {
    render(<Wordmark />);
    const root = screen.getByTestId("wordmark");
    const text = root.textContent ?? "";
    // No dotless-i (U+0131) or other non-ASCII glyphs leak into the DOM.
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      expect(code).toBeLessThan(128);
    }
  });

  it("paints a violet accent dot", () => {
    render(<Wordmark />);
    const dot = screen.getByTestId("wordmark-dot");
    expect(dot.getAttribute("aria-hidden")).toBe("true");
    // The violet accent token is hard-coded as #7C3AED (violet-600).
    // JSDOM normalizes hex to rgb(), so accept either form.
    const style = (dot.getAttribute("style") ?? "").toLowerCase();
    const isViolet =
      style.includes("#7c3aed") || style.includes("rgb(124, 58, 237)");
    expect(isViolet).toBe(true);
  });

  it("renders a cover sliver that hides the native i-dot", () => {
    render(<Wordmark />);
    const cover = screen.getByTestId("wordmark-cover");
    expect(cover.getAttribute("aria-hidden")).toBe("true");
    // The cover is positioned absolutely so it can overlay the original dot.
    const style = cover.getAttribute("style") ?? "";
    expect(style).toContain("position: absolute");
  });

  it("scales by size prop", () => {
    const { rerender } = render(<Wordmark size="sm" />);
    const smStyle = screen.getByTestId("wordmark").getAttribute("style") ?? "";
    expect(smStyle).toContain("font-size: 17px");

    rerender(<Wordmark size="md" />);
    const mdStyle = screen.getByTestId("wordmark").getAttribute("style") ?? "";
    expect(mdStyle).toContain("font-size: 20px");

    rerender(<Wordmark size="lg" />);
    const lgStyle = screen.getByTestId("wordmark").getAttribute("style") ?? "";
    expect(lgStyle).toContain("font-size: 24px");
  });

  it("honors a custom accent color override", () => {
    render(<Wordmark accent="#FF0000" />);
    const dot = screen.getByTestId("wordmark-dot");
    const style = (dot.getAttribute("style") ?? "").toLowerCase();
    const isRed =
      style.includes("#ff0000") || style.includes("rgb(255, 0, 0)");
    expect(isRed).toBe(true);
  });
});
