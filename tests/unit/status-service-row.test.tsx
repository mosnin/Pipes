import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusServiceRow } from "@/components/marketing/StatusServiceRow";
import type { UptimeService } from "@/lib/marketing/status-data";

const HISTORY: ReadonlyArray<number> = Array.from({ length: 30 }, () => 0.98);

const SERVICE: UptimeService = {
  id: "agent-runner",
  name: "Agent runner",
  description: "Builder turns on Modal.",
  status: "operational",
  uptime90d: 99.94,
  history: HISTORY,
  lastChecked: "2026-06-10T14:32:00Z",
};

describe("StatusServiceRow", () => {
  it("renders the service name and description", () => {
    render(<StatusServiceRow service={SERVICE} />);
    expect(screen.getByText("Agent runner")).toBeTruthy();
    expect(screen.getByText("Builder turns on Modal.")).toBeTruthy();
  });

  it("renders the uptime percentage with two decimal places", () => {
    render(<StatusServiceRow service={SERVICE} />);
    expect(screen.getByTestId("status-uptime").textContent).toBe("99.94%");
  });

  it("renders an Operational status pill for an operational service", () => {
    render(<StatusServiceRow service={SERVICE} />);
    expect(screen.getByText("Operational")).toBeTruthy();
  });

  it("renders a Degraded label when the service is degraded", () => {
    render(
      <StatusServiceRow
        service={{ ...SERVICE, status: "degraded", uptime90d: 99.12 }}
      />,
    );
    expect(screen.getByText("Degraded")).toBeTruthy();
  });

  it("renders a sparkline svg labelled for assistive tech", () => {
    const { container } = render(<StatusServiceRow service={SERVICE} />);
    const svg = container.querySelector("svg[role='img']");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("aria-label")).toMatch(/Uptime/i);
  });

  it("renders one bar per history sample", () => {
    const { container } = render(<StatusServiceRow service={SERVICE} />);
    const bars = container.querySelectorAll("svg rect");
    expect(bars.length).toBe(HISTORY.length);
  });
});
