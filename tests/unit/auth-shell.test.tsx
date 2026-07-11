import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "@/components/marketing/AuthShell";

// AuthShell renders the two-column shell that wraps signup, login and invite.
// We check that the form column is in the document, that the proof rail is
// hidden on mobile via the `hidden md:flex` class, and that the breadcrumb
// is visible.

describe("AuthShell", () => {
  it("renders the wordmark and the breadcrumb", () => {
    render(
      <AuthShell breadcrumb="Sign in">
        <p>FORM_CONTENT</p>
      </AuthShell>,
    );
    expect(screen.getByText("FORM_CONTENT")).toBeTruthy();
    expect(screen.getByTestId("wordmark")).toBeTruthy();
    // The breadcrumb is the small contextual label.
    expect(screen.getByText("Sign in")).toBeTruthy();
  });

  it("renders the right-rail proof panel hidden on mobile", () => {
    render(
      <AuthShell breadcrumb="Create your workspace">
        <p>X</p>
      </AuthShell>,
    );
    const proof = screen.getByLabelText("Product proof");
    expect(proof).not.toBeNull();
    // The proof rail collapses on mobile via `hidden md:flex`.
    expect(proof.className).toContain("hidden");
    expect(proof.className).toContain("md:flex");
  });

  it("renders the animated canvas in the proof rail", () => {
    render(
      <AuthShell breadcrumb="Accept invite">
        <p>X</p>
      </AuthShell>,
    );
    expect(screen.getByTestId("animated-canvas")).toBeTruthy();
  });

  it("renders the breadcrumb for every supported screen", () => {
    const labels = ["Sign in", "Create your workspace", "Accept invite"] as const;
    for (const label of labels) {
      const { unmount } = render(
        <AuthShell breadcrumb={label}>
          <p>X</p>
        </AuthShell>,
      );
      expect(screen.getByText(label)).toBeTruthy();
      unmount();
    }
  });
});
