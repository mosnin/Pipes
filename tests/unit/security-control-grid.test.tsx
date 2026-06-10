import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecurityControlGrid } from "@/components/marketing/SecurityControlGrid";
import type { SecurityControl } from "@/lib/marketing/security-data";

const CONTROLS: ReadonlyArray<SecurityControl> = [
  {
    id: "authentication",
    title: "Auth in place",
    category: "Authentication",
    body: "Clerk middleware on every gated route.",
    evidence: "middleware.ts",
  },
  {
    id: "encryption",
    title: "Encryption in place",
    category: "Encryption",
    body: "TLS 1.3 in transit and managed encryption at rest.",
    evidence: "vercel + convex",
  },
  {
    id: "audit-log",
    title: "Audit in place",
    category: "Audit",
    body: "audit_events table records every mutating action.",
    evidence: "audit_events table",
  },
];

describe("SecurityControlGrid", () => {
  it("renders one card per control", () => {
    render(<SecurityControlGrid controls={CONTROLS} />);
    const cards = screen.getAllByTestId("security-control-card");
    expect(cards).toHaveLength(CONTROLS.length);
  });

  it("renders each title and body", () => {
    render(<SecurityControlGrid controls={CONTROLS} />);
    for (const c of CONTROLS) {
      expect(screen.getByText(c.title)).toBeTruthy();
      expect(screen.getByText(c.body)).toBeTruthy();
    }
  });

  it("renders the evidence string", () => {
    render(<SecurityControlGrid controls={CONTROLS} />);
    expect(screen.getByText("middleware.ts")).toBeTruthy();
    expect(screen.getByText("audit_events table")).toBeTruthy();
  });

  it("renders the category chip uppercase", () => {
    render(<SecurityControlGrid controls={CONTROLS} />);
    // Category appears upper-cased through Tailwind. Just check it is present.
    expect(screen.getAllByText("Authentication").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Audit").length).toBeGreaterThan(0);
  });

  it("tags each card with its control id for anchor links", () => {
    render(<SecurityControlGrid controls={CONTROLS} />);
    const cards = screen.getAllByTestId("security-control-card");
    expect(cards[0].getAttribute("data-control-id")).toBe("authentication");
    expect(cards[1].getAttribute("data-control-id")).toBe("encryption");
  });
});
