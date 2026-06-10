import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  CompareFeatureMatrix,
  type FeatureRow,
} from "@/components/marketing/CompareFeatureMatrix";

const ROWS: ReadonlyArray<FeatureRow> = [
  {
    id: "r1",
    feature: "Builds the graph from one sentence",
    pipes: true,
    competitor: false,
    why: "Pipes turns the description into the system.",
  },
  {
    id: "r2",
    feature: "Real-time collaboration",
    pipes: true,
    competitor: true,
    why: "Both edit in real time.",
  },
  {
    id: "r3",
    feature: "Plain values",
    pipes: "Branch history",
    competitor: false,
  },
];

describe("CompareFeatureMatrix", () => {
  it("renders the matrix with a sticky header showing the competitor name", () => {
    render(<CompareFeatureMatrix competitor="Figma" rows={ROWS} />);
    expect(screen.getByTestId("compare-feature-matrix")).toBeTruthy();
    expect(screen.getByText("Pipes")).toBeTruthy();
    expect(screen.getByText("Figma")).toBeTruthy();
    expect(screen.getByText("Feature")).toBeTruthy();
  });

  it("renders every row from the input", () => {
    render(<CompareFeatureMatrix competitor="Figma" rows={ROWS} />);
    for (const r of ROWS) {
      expect(screen.getByTestId(`matrix-row-${r.id}`)).toBeTruthy();
    }
    expect(screen.getByText("Builds the graph from one sentence")).toBeTruthy();
    expect(screen.getByText("Real-time collaboration")).toBeTruthy();
  });

  it("renders rows collapsed by default and does not show the 'why' text", () => {
    render(<CompareFeatureMatrix competitor="Figma" rows={ROWS} />);
    expect(screen.queryByText("Pipes turns the description into the system.")).toBeNull();
  });

  it("expands a row to reveal the why text when clicked", () => {
    render(<CompareFeatureMatrix competitor="Figma" rows={ROWS} />);
    const row = screen.getByTestId("matrix-row-r1");
    const button = row.querySelector("button");
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(screen.getByText("Pipes turns the description into the system.")).toBeTruthy();
  });

  it("collapses a previously opened row when clicked again", async () => {
    render(<CompareFeatureMatrix competitor="Figma" rows={ROWS} />);
    const row = screen.getByTestId("matrix-row-r1");
    const button = row.querySelector("button")!;
    fireEvent.click(button);
    expect(screen.getByText("Pipes turns the description into the system.")).toBeTruthy();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(button);
    // aria-expanded flips synchronously; the exit animation may run async.
    expect(button.getAttribute("aria-expanded")).toBe("false");
    await waitFor(
      () => {
        expect(
          screen.queryByText("Pipes turns the description into the system."),
        ).toBeNull();
      },
      { timeout: 1500 },
    );
  });

  it("only keeps one row open at a time", async () => {
    render(<CompareFeatureMatrix competitor="Figma" rows={ROWS} />);
    const r1 = screen.getByTestId("matrix-row-r1").querySelector("button")!;
    const r2 = screen.getByTestId("matrix-row-r2").querySelector("button")!;
    fireEvent.click(r1);
    expect(screen.getByText("Pipes turns the description into the system.")).toBeTruthy();
    expect(r1.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(r2);
    expect(screen.getByText("Both edit in real time.")).toBeTruthy();
    // The previous row is no longer expanded.
    expect(r1.getAttribute("aria-expanded")).toBe("false");
    expect(r2.getAttribute("aria-expanded")).toBe("true");
    await waitFor(
      () => {
        expect(
          screen.queryByText("Pipes turns the description into the system."),
        ).toBeNull();
      },
      { timeout: 1500 },
    );
  });

  it("renders string values verbatim inside the cells", () => {
    render(<CompareFeatureMatrix competitor="Figma" rows={ROWS} />);
    expect(screen.getByText("Branch history")).toBeTruthy();
  });
});
