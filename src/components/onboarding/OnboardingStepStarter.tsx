"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { OnboardingStepShell, type OnboardingStep } from "./OnboardingStepShell";
import { starterTemplates } from "@/domain/templates/catalog";
import type { RoleId } from "@/lib/onboarding/storage";

// Step 3 — pick something the agent will build.
// The chips pull from the real `starterTemplates` catalog. We pick three per
// role; if the user chose "other" or no role, we show three popular defaults.
// Each chip is the title + a single-sentence detail.

const ROLE_TO_STARTER_IDS: Record<RoleId, ReadonlyArray<string>> = {
  "multi-agent-systems": [
    "multi-agent-handoff",
    "multi-agent-research",
    "code-review-assistant",
  ],
  "customer-support": [
    "customer-support-triage",
    "support-ops-system",
    "content-moderation-pipeline",
  ],
  "data-pipelines": [
    "data-extraction-pipeline",
    "automation-workflow",
    "document-qa-system",
  ],
  "internal-tools": [
    "automation-workflow",
    "onboarding-orchestrator",
    "meeting-coordinator",
  ],
  research: [
    "multi-agent-research",
    "research-deep-dive",
    "document-qa-system",
  ],
  other: [
    "multi-agent-handoff",
    "automation-workflow",
    "customer-support-triage",
  ],
};

type StarterChip = {
  id: string;
  title: string;
  detail: string;
  prompt: string;
};

export type OnboardingStepStarterProps = {
  step: OnboardingStep;
  roleId: RoleId | null;
  starterId: string | null;
  direction?: 1 | -1;
  onSelect: (id: string) => void;
  onContinue: () => void;
  onBack?: () => void;
  onJumpTo?: (step: OnboardingStep) => void;
};

export function OnboardingStepStarter({
  step,
  roleId,
  starterId,
  direction,
  onSelect,
  onContinue,
  onBack,
  onJumpTo,
}: OnboardingStepStarterProps) {
  const starters = useMemo(() => pickStarters(roleId), [roleId]);

  return (
    <OnboardingStepShell
      step={step}
      direction={direction}
      title="Pick something the agent will build for you."
      subtitle="Just to show you how it works. You can throw it away after."
      onBack={onBack}
      onContinue={onContinue}
      onJumpTo={onJumpTo}
      continueDisabled={starterId == null}
      continueLabel="Build it"
    >
      <ul role="radiogroup" className="grid grid-cols-1 gap-3">
        {starters.map((starter) => {
          const selected = starter.id === starterId;
          return (
            <li key={starter.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(starter.id)}
                className={[
                  "w-full text-left rounded-2xl border px-4 py-4",
                  "min-h-[56px] flex items-start gap-3",
                  "transition-all duration-150",
                  selected
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                    : "border-black/[0.08] bg-white hover:border-black/[0.18] hover:bg-[#FAFAFA]",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border shrink-0",
                    selected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-black/[0.18]",
                  ].join(" ")}
                >
                  {selected && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block t-title text-[#111]">
                    {starter.title}
                  </span>
                  <span className="block mt-1 t-label text-[#3C3C43] leading-relaxed">
                    {starter.detail}
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

// ---------------------------------------------------------------------------

export function pickStarters(roleId: RoleId | null): StarterChip[] {
  const ids = roleId != null
    ? ROLE_TO_STARTER_IDS[roleId]
    : ROLE_TO_STARTER_IDS.other;
  const chips: StarterChip[] = [];
  for (const id of ids) {
    const t = starterTemplates.find((s) => s.id === id);
    if (t == null) continue;
    chips.push({
      id: t.id,
      title: t.title,
      detail: t.description,
      prompt: t.useCase,
    });
  }
  // Pad with popular defaults if the role list missed any (defensive).
  if (chips.length < 3) {
    const fallback = ["multi-agent-handoff", "automation-workflow", "customer-support-triage"];
    for (const id of fallback) {
      if (chips.length >= 3) break;
      if (chips.some((c) => c.id === id)) continue;
      const t = starterTemplates.find((s) => s.id === id);
      if (t == null) continue;
      chips.push({ id: t.id, title: t.title, detail: t.description, prompt: t.useCase });
    }
  }
  return chips.slice(0, 3);
}

export function getStarterPrompt(starterId: string): string | null {
  const t = starterTemplates.find((s) => s.id === starterId);
  return t?.useCase ?? null;
}
