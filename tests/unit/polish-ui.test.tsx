import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui";

describe("polish ui accessibility", () => {
  it("renders empty state as polite status region", () => {
    render(<EmptyState title="No systems" description="Create your first system." />);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });
});
