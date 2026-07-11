import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmark } from "@/components/Wordmark";

describe("Wordmark", () => {
  it("renders 'Pipes' as accessible text", () => {
    render(<Wordmark />);
    const root = screen.getByTestId("wordmark");
    expect(root).toBeTruthy();
    expect(root.textContent).toBe("Pipes");
  });

  it("uses ASCII-safe characters only", () => {
    render(<Wordmark />);
    const root = screen.getByTestId("wordmark");
    const text = root.textContent ?? "";
    for (const ch of text) {
      expect(ch.charCodeAt(0)).toBeLessThan(128);
    }
  });

  it("paints the 'i' in the violet accent", () => {
    render(<Wordmark />);
    const root = screen.getByTestId("wordmark");
    // The "i" is wrapped in a span carrying the accent color.
    const accentSpan = root.querySelector("span");
    expect(accentSpan?.textContent).toBe("i");
    const style = (accentSpan?.getAttribute("style") ?? "").toLowerCase();
    const isViolet =
      style.includes("#7c3aed") || style.includes("rgb(124, 58, 237)");
    expect(isViolet).toBe(true);
  });

  it("scales by size prop", () => {
    const { rerender } = render(<Wordmark size="sm" />);
    expect(screen.getByTestId("wordmark").getAttribute("style") ?? "").toContain("font-size: 17px");

    rerender(<Wordmark size="md" />);
    expect(screen.getByTestId("wordmark").getAttribute("style") ?? "").toContain("font-size: 20px");

    rerender(<Wordmark size="lg" />);
    expect(screen.getByTestId("wordmark").getAttribute("style") ?? "").toContain("font-size: 24px");
  });

  it("honors a custom accent color override", () => {
    render(<Wordmark accent="#FF0000" />);
    const accentSpan = screen.getByTestId("wordmark").querySelector("span");
    const style = (accentSpan?.getAttribute("style") ?? "").toLowerCase();
    const isRed = style.includes("#ff0000") || style.includes("rgb(255, 0, 0)");
    expect(isRed).toBe(true);
  });
});
