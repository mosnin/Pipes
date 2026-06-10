import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OnboardingStepRole } from "@/components/onboarding/OnboardingStepRole";
import { OnboardingStepWorkspace } from "@/components/onboarding/OnboardingStepWorkspace";
import {
  OnboardingStepStarter,
  pickStarters,
} from "@/components/onboarding/OnboardingStepStarter";
import { starterTemplates } from "@/domain/templates/catalog";
import { ROLE_IDS } from "@/lib/onboarding/storage";

// ---------------------------------------------------------------------------
// Step 1 — role
// ---------------------------------------------------------------------------

describe("OnboardingStepRole", () => {
  it("renders six role chips", () => {
    render(
      <OnboardingStepRole
        step={1}
        roleId={null}
        onSelect={() => {}}
        onContinue={() => {}}
      />,
    );
    const chips = screen.getAllByRole("radio");
    expect(chips).toHaveLength(6);
  });

  it("disables Continue until a chip is selected", () => {
    const { rerender } = render(
      <OnboardingStepRole
        step={1}
        roleId={null}
        onSelect={() => {}}
        onContinue={() => {}}
      />,
    );
    const btn = screen.getByRole("button", { name: /continue/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <OnboardingStepRole
        step={1}
        roleId="multi-agent-systems"
        onSelect={() => {}}
        onContinue={() => {}}
      />,
    );
    expect((screen.getByRole("button", { name: /continue/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("calls onSelect when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <OnboardingStepRole
        step={1}
        roleId={null}
        onSelect={onSelect}
        onContinue={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Multi-agent systems"));
    expect(onSelect).toHaveBeenCalledWith("multi-agent-systems");
  });

  it("marks the selected chip via aria-checked", () => {
    render(
      <OnboardingStepRole
        step={1}
        roleId="research"
        onSelect={() => {}}
        onContinue={() => {}}
      />,
    );
    const chip = screen
      .getAllByRole("radio")
      .find((el) => el.getAttribute("aria-checked") === "true");
    expect(chip).toBeTruthy();
    expect(chip!.textContent ?? "").toContain("Research");
  });
});

// ---------------------------------------------------------------------------
// Step 2 — workspace
// ---------------------------------------------------------------------------

describe("OnboardingStepWorkspace", () => {
  it("disables Continue when the name is empty", () => {
    render(
      <OnboardingStepWorkspace
        step={2}
        firstName="Sam"
        roleId="research"
        workspaceName=""
        onChange={() => {}}
        onContinue={() => {}}
      />,
    );
    expect((screen.getByRole("button", { name: /continue/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables Continue once the name is non-empty", () => {
    render(
      <OnboardingStepWorkspace
        step={2}
        firstName="Sam"
        roleId="research"
        workspaceName="Acme"
        onChange={() => {}}
        onContinue={() => {}}
      />,
    );
    expect((screen.getByRole("button", { name: /continue/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("uses the Clerk firstName in the suggestions", () => {
    render(
      <OnboardingStepWorkspace
        step={2}
        firstName="Sam"
        roleId="research"
        workspaceName=""
        onChange={() => {}}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByText("Sam's workspace")).toBeTruthy();
    expect(screen.getByText("Research workspace")).toBeTruthy();
    expect(screen.getByText("Sam x Research")).toBeTruthy();
  });

  it("falls back gracefully when firstName is null", () => {
    render(
      <OnboardingStepWorkspace
        step={2}
        firstName={null}
        roleId="customer-support"
        workspaceName=""
        onChange={() => {}}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByText("Support workspace")).toBeTruthy();
    expect(screen.getByText("Support team")).toBeTruthy();
  });

  it("calls onChange when a suggestion chip is clicked", () => {
    const onChange = vi.fn();
    render(
      <OnboardingStepWorkspace
        step={2}
        firstName="Sam"
        roleId="research"
        workspaceName=""
        onChange={onChange}
        onContinue={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Sam's workspace"));
    expect(onChange).toHaveBeenCalledWith("Sam's workspace");
  });

  it("submits on Enter when the field is non-empty", () => {
    const onContinue = vi.fn();
    render(
      <OnboardingStepWorkspace
        step={2}
        firstName="Sam"
        roleId="research"
        workspaceName="Acme"
        onChange={() => {}}
        onContinue={onContinue}
      />,
    );
    const input = screen.getByLabelText("Workspace name");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onContinue).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Step 3 — starter
// ---------------------------------------------------------------------------

describe("OnboardingStepStarter", () => {
  it("renders three starter chips", () => {
    render(
      <OnboardingStepStarter
        step={3}
        roleId="multi-agent-systems"
        starterId={null}
        onSelect={() => {}}
        onContinue={() => {}}
      />,
    );
    const chips = screen.getAllByRole("radio");
    expect(chips).toHaveLength(3);
  });

  it("disables Build it until a chip is picked", () => {
    render(
      <OnboardingStepStarter
        step={3}
        roleId="multi-agent-systems"
        starterId={null}
        onSelect={() => {}}
        onContinue={() => {}}
      />,
    );
    expect((screen.getByRole("button", { name: /build it/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onSelect with the catalog id when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <OnboardingStepStarter
        step={3}
        roleId="multi-agent-systems"
        starterId={null}
        onSelect={onSelect}
        onContinue={() => {}}
      />,
    );
    const chip = screen.getByText("Multi-agent Handoff");
    fireEvent.click(chip);
    expect(onSelect).toHaveBeenCalledWith("multi-agent-handoff");
  });

  it("pulls every chip from the real starterTemplates catalog", () => {
    const known = new Set(starterTemplates.map((t) => t.id));
    for (const role of ROLE_IDS) {
      const chips = pickStarters(role);
      expect(chips).toHaveLength(3);
      for (const c of chips) {
        expect(known.has(c.id)).toBe(true);
        expect(c.detail.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns three popular defaults when no role is selected", () => {
    const chips = pickStarters(null);
    expect(chips).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// localStorage flag — onboarding completed
// ---------------------------------------------------------------------------

describe("onboarding completed flag", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("getOnboardingCompleted returns false before the flag is set", async () => {
    const { getOnboardingCompleted } = await import("@/lib/feedback/storage");
    expect(getOnboardingCompleted()).toBe(false);
  });

  it("getOnboardingCompleted returns true after setOnboardingCompleted", async () => {
    const { getOnboardingCompleted, setOnboardingCompleted } = await import(
      "@/lib/feedback/storage"
    );
    setOnboardingCompleted();
    expect(getOnboardingCompleted()).toBe(true);
    expect(window.localStorage.getItem("pipes-onboarding-completed")).toBe(
      "true",
    );
  });
});

// ---------------------------------------------------------------------------
// onboarding state persistence
// ---------------------------------------------------------------------------

describe("onboarding state persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the state via writeOnboardingState / readOnboardingState", async () => {
    const { writeOnboardingState, readOnboardingState } = await import(
      "@/lib/onboarding/storage"
    );
    writeOnboardingState({
      step: 3,
      roleId: "research",
      workspaceName: "My Lab",
      starterId: "research-deep-dive",
    });
    const next = readOnboardingState();
    expect(next.step).toBe(3);
    expect(next.roleId).toBe("research");
    expect(next.workspaceName).toBe("My Lab");
    expect(next.starterId).toBe("research-deep-dive");
  });

  it("falls back to defaults when the stored state is corrupt", async () => {
    window.localStorage.setItem("pipes-onboarding-state", "not-json");
    const { readOnboardingState } = await import("@/lib/onboarding/storage");
    const next = readOnboardingState();
    expect(next.step).toBe(1);
    expect(next.roleId).toBeNull();
  });
});
