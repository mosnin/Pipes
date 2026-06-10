"use client";

import { Check } from "lucide-react";
import { OnboardingStepShell, type OnboardingStep } from "./OnboardingStepShell";
import type { RoleId } from "@/lib/onboarding/storage";

// Step 1 — what do you build?
// Six chips. Each chip is a 56-px-tall rounded card so thumbs can hit it.
// The text varies on purpose: no copy-paste filler.

type RoleChip = {
  id: RoleId;
  label: string;
  detail: string;
};

const ROLES: ReadonlyArray<RoleChip> = [
  {
    id: "multi-agent-systems",
    label: "Multi-agent systems",
    detail: "Agents that hand off through one contract.",
  },
  {
    id: "customer-support",
    label: "Customer support",
    detail: "Triage, route, and resolve inbound tickets.",
  },
  {
    id: "data-pipelines",
    label: "Data pipelines",
    detail: "Move and reshape data between systems.",
  },
  {
    id: "internal-tools",
    label: "Internal tools",
    detail: "Workflows the rest of the company runs on.",
  },
  {
    id: "research",
    label: "Research",
    detail: "Investigate, synthesize, fact-check.",
  },
  {
    id: "other",
    label: "Something else",
    detail: "Tell us in the next step.",
  },
];

export type OnboardingStepRoleProps = {
  step: OnboardingStep;
  roleId: RoleId | null;
  onSelect: (roleId: RoleId) => void;
  onContinue: () => void;
  onBack?: () => void;
  onJumpTo?: (step: OnboardingStep) => void;
};

export function OnboardingStepRole({
  step,
  roleId,
  onSelect,
  onContinue,
  onBack,
  onJumpTo,
}: OnboardingStepRoleProps) {
  return (
    <OnboardingStepShell
      step={step}
      title="What do you build?"
      subtitle="Tells us how to tune the agent for you."
      onBack={onBack}
      onContinue={onContinue}
      onJumpTo={onJumpTo}
      continueDisabled={roleId == null}
    >
      <ul
        role="radiogroup"
        aria-label="What do you build?"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {ROLES.map((role) => {
          const selected = role.id === roleId;
          return (
            <li key={role.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(role.id)}
                className={[
                  "w-full text-left rounded-2xl border px-4 py-3.5",
                  "min-h-[56px] flex items-center gap-3",
                  "transition-all duration-150",
                  selected
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                    : "border-black/[0.08] bg-white hover:border-black/[0.18] hover:bg-[#FAFAFA]",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "flex h-5 w-5 items-center justify-center rounded-full border",
                    "transition-colors shrink-0",
                    selected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-black/[0.18]",
                  ].join(" ")}
                >
                  {selected && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block t-label font-semibold text-[#111]">
                    {role.label}
                  </span>
                  <span className="block mt-0.5 t-caption text-[#8E8E93]">
                    {role.detail}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </OnboardingStepShell>
  );
}
