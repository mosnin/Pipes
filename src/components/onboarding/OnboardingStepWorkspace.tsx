"use client";

import { useMemo } from "react";
import { OnboardingStepShell, type OnboardingStep } from "./OnboardingStepShell";
import type { RoleId } from "@/lib/onboarding/storage";

// Step 2 — name the workspace.
// Big text input plus three suggested names. Suggestions interpolate real
// Clerk firstName and the chosen role so they read like the user's own choice.

const ROLE_LABEL: Record<RoleId, string> = {
  "multi-agent-systems": "Multi-agent",
  "customer-support": "Support",
  "data-pipelines": "Data",
  "internal-tools": "Internal",
  research: "Research",
  other: "Build",
};

export type OnboardingStepWorkspaceProps = {
  step: OnboardingStep;
  firstName: string | null;
  roleId: RoleId | null;
  workspaceName: string;
  onChange: (name: string) => void;
  onContinue: () => void;
  onBack?: () => void;
  onJumpTo?: (step: OnboardingStep) => void;
};

export function OnboardingStepWorkspace({
  step,
  firstName,
  roleId,
  workspaceName,
  onChange,
  onContinue,
  onBack,
  onJumpTo,
}: OnboardingStepWorkspaceProps) {
  const suggestions = useMemo(
    () => buildSuggestions(firstName, roleId),
    [firstName, roleId],
  );

  const trimmed = workspaceName.trim();
  const disabled = trimmed.length === 0;

  return (
    <OnboardingStepShell
      step={step}
      title="Name your workspace."
      subtitle="You can change this later. One workspace per team is plenty."
      onBack={onBack}
      onContinue={onContinue}
      onJumpTo={onJumpTo}
      continueDisabled={disabled}
    >
      <div>
        <label htmlFor="workspace-name" className="sr-only">
          Workspace name
        </label>
        <input
          id="workspace-name"
          autoFocus
          type="text"
          value={workspaceName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Acme AI"
          maxLength={80}
          className="
            w-full h-14 px-4
            rounded-2xl border border-black/[0.08] bg-white
            t-h2 text-[#111] placeholder:text-[#C7C7CC]
            outline-none
            focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
            transition-shadow
          "
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) onContinue();
          }}
        />

        <div className="mt-5">
          <p className="t-caption text-[#8E8E93]">Suggestions</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const active = s === workspaceName;
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onChange(s)}
                    className={[
                      "h-9 px-3.5 rounded-full border t-label transition-colors",
                      active
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-black/[0.08] bg-white text-[#3C3C43] hover:border-black/[0.18] hover:text-[#111]",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </OnboardingStepShell>
  );
}

function buildSuggestions(firstName: string | null, roleId: RoleId | null): string[] {
  const name = (firstName ?? "").trim();
  const roleLabel = roleId != null ? ROLE_LABEL[roleId] : "Build";
  const list: string[] = [];
  if (name.length > 0) list.push(`${name}'s workspace`);
  list.push(`${roleLabel} workspace`);
  if (name.length > 0) {
    list.push(`${name} x ${roleLabel}`);
  } else {
    list.push(`${roleLabel} team`);
  }
  // de-dupe while preserving order
  return Array.from(new Set(list));
}
