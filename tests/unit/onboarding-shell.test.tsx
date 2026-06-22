import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OnboardingStepShell } from "@/components/onboarding/OnboardingStepShell";

// The shell exposes a four-dot progress indicator, a content slot and
// back/continue controls. We verify each branch.

describe("OnboardingStepShell", () => {
  it("renders the title and subtitle", () => {
    render(
      <OnboardingStepShell
        step={1}
        title="HEAD"
        subtitle="SUB"
        onContinue={() => {}}
      >
        <div>CONTENT</div>
      </OnboardingStepShell>,
    );
    expect(screen.getByText("HEAD")).toBeTruthy();
    expect(screen.getByText("SUB")).toBeTruthy();
    expect(screen.getByText("CONTENT")).toBeTruthy();
  });

  it("renders three progress dots", () => {
    render(
      <OnboardingStepShell
        step={2}
        title="t"
        subtitle="s"
        onContinue={() => {}}
      >
        <div />
      </OnboardingStepShell>,
    );
    const dots = screen.getAllByRole("tab");
    expect(dots).toHaveLength(3);
  });

  it("marks the active step via aria-selected", () => {
    render(
      <OnboardingStepShell
        step={3}
        title="t"
        subtitle="s"
        onContinue={() => {}}
      >
        <div />
      </OnboardingStepShell>,
    );
    const active = screen
      .getAllByRole("tab")
      .find((el) => el.getAttribute("aria-selected") === "true");
    expect(active).toBeTruthy();
    expect(active!.getAttribute("aria-label")).toBe("Step 3");
  });

  it("calls onJumpTo when a previous dot is clicked", () => {
    const onJumpTo = vi.fn();
    render(
      <OnboardingStepShell
        step={3}
        title="t"
        subtitle="s"
        onContinue={() => {}}
        onJumpTo={onJumpTo}
      >
        <div />
      </OnboardingStepShell>,
    );
    // Step 1 is < step 3 so its dot is a button.
    const dot = screen.getByLabelText("Step 1");
    fireEvent.click(dot);
    expect(onJumpTo).toHaveBeenCalledWith(1);
  });

  it("does not let the user click forward to a later step", () => {
    const onJumpTo = vi.fn();
    render(
      <OnboardingStepShell
        step={1}
        title="t"
        subtitle="s"
        onContinue={() => {}}
        onJumpTo={onJumpTo}
      >
        <div />
      </OnboardingStepShell>,
    );
    // Step 3 is in the future, dot is not a button — clicking it should be inert.
    const dot = screen.getByLabelText("Step 3");
    fireEvent.click(dot);
    expect(onJumpTo).not.toHaveBeenCalled();
  });

  it("disables the continue button when continueDisabled is true", () => {
    render(
      <OnboardingStepShell
        step={1}
        title="t"
        subtitle="s"
        onContinue={() => {}}
        continueDisabled
      >
        <div />
      </OnboardingStepShell>,
    );
    const btn = screen.getByRole("button", { name: /continue/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("fires onContinue when the button is clicked", () => {
    const onContinue = vi.fn();
    render(
      <OnboardingStepShell
        step={1}
        title="t"
        subtitle="s"
        onContinue={onContinue}
      >
        <div />
      </OnboardingStepShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("hides the back/continue row when hideControls is set", () => {
    render(
      <OnboardingStepShell
        step={3}
        title="t"
        subtitle="s"
        hideControls
      >
        <div />
      </OnboardingStepShell>,
    );
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });
});
