import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/empty-state";

describe("polish ui accessibility", () => {
  it("renders an empty state with its title and body", () => {
    render(<EmptyState title="No systems yet" body="Create your first system." />);
    expect(screen.getByText("No systems yet")).toBeTruthy();
    expect(screen.getByText("Create your first system.")).toBeTruthy();
  });
});
