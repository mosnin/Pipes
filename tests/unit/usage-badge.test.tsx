import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { UsageBadge } from "@/components/UsageBadge";

describe("UsageBadge", () => {
  it("renders nothing for paid Pro plan", () => {
    const { queryByTestId } = render(
      <UsageBadge initialData={{ used: 10, limit: 1000, plan: "Pro" }} />,
    );
    expect(queryByTestId("usage-badge")).toBeNull();
  });

  it("renders nothing for Builder plan", () => {
    const { queryByTestId } = render(
      <UsageBadge initialData={{ used: 10, limit: 10000, plan: "Builder" }} />,
    );
    expect(queryByTestId("usage-badge")).toBeNull();
  });

  it("renders nothing for Enterprise plan", () => {
    const { queryByTestId } = render(
      <UsageBadge
        initialData={{ used: 10, limit: Number.POSITIVE_INFINITY, plan: "Enterprise" }}
      />,
    );
    expect(queryByTestId("usage-badge")).toBeNull();
  });

  it("renders a ghost pill for Free under 80%", () => {
    const { getByTestId } = render(
      <UsageBadge initialData={{ used: 10, limit: 50, plan: "Free" }} />,
    );
    const el = getByTestId("usage-badge");
    expect(el.textContent).toBe("10 / 50 builds");
    // Should NOT carry the amber or red classes.
    expect(el.className).not.toContain("amber");
    expect(el.className).not.toContain("red");
  });

  it("renders an amber pill for Free between 80% and 100%", () => {
    const { getByTestId } = render(
      <UsageBadge initialData={{ used: 45, limit: 50, plan: "Free" }} />,
    );
    const el = getByTestId("usage-badge");
    expect(el.textContent).toBe("45 / 50 builds");
    expect(el.className).toContain("amber");
  });

  it("renders a red pill with upgrade hint at 100% or above", () => {
    const { getByTestId } = render(
      <UsageBadge initialData={{ used: 50, limit: 50, plan: "Free" }} />,
    );
    const el = getByTestId("usage-badge");
    expect(el.textContent).toBe("50 / 50 builds — upgrade");
    expect(el.className).toContain("red");
  });

  it("renders red even when usage exceeds the limit", () => {
    const { getByTestId } = render(
      <UsageBadge initialData={{ used: 73, limit: 50, plan: "Free" }} />,
    );
    const el = getByTestId("usage-badge");
    expect(el.textContent).toBe("73 / 50 builds — upgrade");
  });

  it("routes to /settings/billing on click", () => {
    const { getByTestId } = render(
      <UsageBadge initialData={{ used: 10, limit: 50, plan: "Free" }} />,
    );
    const el = getByTestId("usage-badge") as HTMLAnchorElement;
    expect(el.getAttribute("href")).toBe("/settings/billing");
  });
});
