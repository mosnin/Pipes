import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorErrorBoundary } from "@/components/editor/EditorErrorBoundary";

function Boom() {
  throw new Error("boom");
  return null;
}

describe("EditorErrorBoundary", () => {
  it("renders fallback on panel crash", () => {
    const onCrash = vi.fn();
    render(<EditorErrorBoundary area="Canvas" onCrash={onCrash}><Boom /></EditorErrorBoundary>);
    expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy();
    expect(onCrash).toHaveBeenCalled();
  });
});
