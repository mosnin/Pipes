import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import {
  Button,
  Input,
  Textarea,
  Dialog,
  Tooltip,
  MetricCard,
  DataTable,
  EmptyState,
  SegmentedControl,
  SearchInput,
  StatusBadge,
  Breadcrumbs,
} from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";

/**
 * jsdom-based accessibility tests for our UI primitives.
 *
 * Note: axe-core in jsdom is partially incomplete (no real layout means a
 * subset of rules can be evaluated). The Playwright spec is the authoritative
 * gate. We assert no serious/critical violations on the rules that DO run.
 */

type Impact = "minor" | "moderate" | "serious" | "critical";

async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const result = await axe.run(container, {
    resultTypes: ["violations"],
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    // jsdom has no layout engine and no canvas; color-contrast cannot be
    // evaluated reliably here. The Playwright spec is the authoritative gate
    // for color-contrast violations against the real rendered page.
    rules: { "color-contrast": { enabled: false } },
  });
  const serious = result.violations.filter((v) => {
    const impact = (v.impact ?? "minor") as Impact;
    return impact === "serious" || impact === "critical";
  });
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

describe("UI primitive accessibility", () => {
  it("Button has no serious axe violations", async () => {
    const { container } = render(<Button>Primary action</Button>);
    await expectNoA11yViolations(container);
  });

  it("Input wrapped in a label has no serious axe violations", async () => {
    const { container } = render(
      <label>
        Email
        <Input type="email" name="email" />
      </label>,
    );
    await expectNoA11yViolations(container);
  });

  it("Textarea wrapped in a label has no serious axe violations", async () => {
    const { container } = render(
      <label>
        Notes
        <Textarea name="notes" />
      </label>,
    );
    await expectNoA11yViolations(container);
  });

  it("Dialog has no serious axe violations when open", async () => {
    const { container } = render(
      <Dialog
        open
        onOpenChange={() => undefined}
        title="Confirm deletion"
        description="This action cannot be undone."
      >
        <p>Body content for the dialog.</p>
      </Dialog>,
    );
    await expectNoA11yViolations(container);
  });

  it("Tooltip has no serious axe violations", async () => {
    const { container } = render(
      <Tooltip content="Save changes">
        <Button>Save</Button>
      </Tooltip>,
    );
    await expectNoA11yViolations(container);
  });

  it("MetricCard has no serious axe violations", async () => {
    const { container } = render(
      <MetricCard label="Active systems" value="42" delta="+3" deltaTone="up" />,
    );
    await expectNoA11yViolations(container);
  });

  it("DataTable has no serious axe violations", async () => {
    type Row = { id: string; name: string; status: string };
    const columns: DataTableColumn<Row>[] = [
      { key: "name", header: "Name" },
      { key: "status", header: "Status" },
    ];
    const rows: Row[] = [
      { id: "1", name: "Alpha", status: "ok" },
      { id: "2", name: "Beta", status: "ok" },
    ];
    const { container } = render(<DataTable columns={columns} rows={rows} />);
    await expectNoA11yViolations(container);
  });

  it("EmptyState has no serious axe violations", async () => {
    const { container } = render(
      <EmptyState
        title="No systems yet"
        description="Create your first system to get started."
      />,
    );
    await expectNoA11yViolations(container);
  });

  it("SegmentedControl has no serious axe violations", async () => {
    const items = [
      { id: "day", label: "Day" },
      { id: "week", label: "Week" },
      { id: "month", label: "Month" },
    ];
    const { container } = render(
      <SegmentedControl items={items} value="day" onChange={() => undefined} />,
    );
    await expectNoA11yViolations(container);
  });

  it("SearchInput has no serious axe violations", async () => {
    const { container } = render(
      <label>
        Search
        <SearchInput value="" onChange={() => undefined} placeholder="Search" />
      </label>,
    );
    await expectNoA11yViolations(container);
  });

  it("StatusBadge has no serious axe violations", async () => {
    const { container } = render(
      <StatusBadge tone="success" pulse>
        Operational
      </StatusBadge>,
    );
    await expectNoA11yViolations(container);
  });

  it("Breadcrumbs has no serious axe violations", async () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Systems", href: "/systems" },
          { label: "Detail" },
        ]}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
