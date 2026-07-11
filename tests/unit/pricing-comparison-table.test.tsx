import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PricingComparisonTable,
  type ComparisonGroup,
} from "@/components/marketing/PricingComparisonTable";

const GROUPS: readonly ComparisonGroup[] = [
  {
    title: "Build",
    rows: [
      {
        feature: "Builds per month",
        detail: "One build = one prompt the agent acts on.",
        starter: "50",
        pro: "Unlimited",
        team: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        feature: "Comments",
        starter: false,
        pro: true,
        team: true,
        enterprise: true,
      },
    ],
  },
  {
    title: "Protocol",
    rows: [
      {
        feature: "Capability-scoped tokens",
        starter: false,
        pro: { kind: "limited", label: "Limited" },
        team: true,
        enterprise: true,
      },
    ],
  },
] as const;

describe("PricingComparisonTable", () => {
  it("renders the four tier columns", () => {
    render(<PricingComparisonTable groups={GROUPS} />);
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
    expect(screen.getByText("Team")).toBeTruthy();
    expect(screen.getByText("Enterprise")).toBeTruthy();
  });

  it("renders each group header", () => {
    render(<PricingComparisonTable groups={GROUPS} />);
    expect(screen.getByText("Build")).toBeTruthy();
    expect(screen.getByText("Protocol")).toBeTruthy();
  });

  it("renders every feature row", () => {
    render(<PricingComparisonTable groups={GROUPS} />);
    expect(screen.getByText("Builds per month")).toBeTruthy();
    expect(screen.getByText("Comments")).toBeTruthy();
    expect(screen.getByText("Capability-scoped tokens")).toBeTruthy();
  });

  it("renders the inline detail under a feature", () => {
    render(<PricingComparisonTable groups={GROUPS} />);
    expect(
      screen.getByText("One build = one prompt the agent acts on."),
    ).toBeTruthy();
  });

  it("renders typed string values as text", () => {
    render(<PricingComparisonTable groups={GROUPS} />);
    expect(screen.getByText("50")).toBeTruthy();
    expect(screen.getAllByText("Unlimited").length).toBeGreaterThanOrEqual(2);
  });

  it("renders included booleans as a labelled check", () => {
    render(<PricingComparisonTable groups={GROUPS} />);
    // The Comments row has team and enterprise = true. Aria-label "Included".
    const checks = screen.getAllByLabelText("Included");
    expect(checks.length).toBeGreaterThanOrEqual(2);
  });

  it("renders excluded booleans as a labelled em-dash", () => {
    render(<PricingComparisonTable groups={GROUPS} />);
    // Comments starter = false. Capability tokens starter = false.
    const dashes = screen.getAllByLabelText("Not included");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the Limited variant with its label", () => {
    render(<PricingComparisonTable groups={GROUPS} />);
    expect(screen.getByText("Limited")).toBeTruthy();
  });
});
