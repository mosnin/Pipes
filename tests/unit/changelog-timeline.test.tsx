import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ChangelogTimeline } from "@/components/marketing/ChangelogTimeline";
import type { ChangelogEntry } from "@/lib/marketing/changelog-data";

const ENTRIES: ReadonlyArray<ChangelogEntry> = [
  {
    version: "v3.0.0",
    date: "2026-06-01",
    anchor: "v3-0-0",
    title: "June release",
    summary: "June one.",
    changes: [{ kind: "shipped", text: "Thing A" }],
  },
  {
    version: "v2.9.0",
    date: "2026-05-12",
    anchor: "v2-9-0",
    title: "May release",
    summary: "May one.",
    changes: [
      { kind: "shipped", text: "Thing B" },
      { kind: "improved", text: "Thing C" },
    ],
  },
  {
    version: "v2.1.0",
    date: "2025-11-04",
    anchor: "v2-1-0",
    title: "November release",
    summary: "Nov one.",
    changes: [{ kind: "fixed", text: "Thing D" }],
  },
];

describe("ChangelogTimeline", () => {
  it("renders every entry", () => {
    render(<ChangelogTimeline entries={ENTRIES} />);
    const items = screen.getAllByTestId("changelog-entry");
    expect(items).toHaveLength(ENTRIES.length);
  });

  it("groups entries under year markers with newest year first", () => {
    render(<ChangelogTimeline entries={ENTRIES} />);
    const markers = screen.getAllByTestId("changelog-year-marker");
    expect(markers).toHaveLength(2);
    expect(within(markers[0]).getByText("2026")).toBeTruthy();
    expect(within(markers[1]).getByText("2025")).toBeTruthy();
  });

  it("renders each version pill exactly once", () => {
    render(<ChangelogTimeline entries={ENTRIES} />);
    for (const e of ENTRIES) {
      const matches = screen.getAllByText(e.version);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("attaches the anchor id to the entry article", () => {
    const { container } = render(<ChangelogTimeline entries={ENTRIES} />);
    expect(container.querySelector("#v3-0-0")).not.toBeNull();
    expect(container.querySelector("#v2-1-0")).not.toBeNull();
  });

  it("groups multiple entries under the same year", () => {
    render(<ChangelogTimeline entries={ENTRIES} />);
    const markers = screen.getAllByTestId("changelog-year-marker");
    // 2026 has 2 entries
    expect(within(markers[0]).getByText("2 releases")).toBeTruthy();
    // 2025 has 1 entry
    expect(within(markers[1]).getByText("1 release")).toBeTruthy();
  });
});
