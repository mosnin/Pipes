import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, EmptyState, Input, Card } from "@/components/ui";

describe("ui primitives styling contract", () => {
  it("renders empty state as polite status region", () => {
    render(<EmptyState title="No systems" description="Create your first system." />);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it("applies design-system classes to core controls", () => {
    render(
      <div>
        <Button>Save</Button>
        <Input aria-label="Name" />
        <Card>Panel</Card>
      </div>
    );

    expect(screen.getByRole("button", { name: "Save" }).className).toContain("btn");
    expect(screen.getByLabelText("Name").className).toContain("input");
    expect(screen.getByText("Panel").closest("section")?.className).toContain("card");
  });
});
