"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { OnboardingStepRole } from "@/components/onboarding/OnboardingStepRole";
import { OnboardingStepStarter } from "@/components/onboarding/OnboardingStepStarter";
import { OnboardingStepLaunch } from "@/components/onboarding/OnboardingStepLaunch";
import type { OnboardingStep } from "@/components/onboarding/OnboardingStepShell";
import { useOnboardingState } from "@/lib/onboarding/use-onboarding-state";
import { clearOnboardingState, type RoleId } from "@/lib/onboarding/storage";
import {
  getOnboardingCompleted,
  setOnboardingCompleted,
} from "@/lib/feedback/storage";

// Welcome page — the post-signup onboarding wizard.
// Four steps in a single client component so AnimatePresence can cross-fade
// between them. If the user has already completed onboarding we short-circuit
// to /dashboard so refreshes never trap them here.

export default function WelcomePage() {
  const router = useRouter();
  const { state, hydrated, setStep, setRoleId, setStarterId } =
    useOnboardingState();
  const [shouldRender, setShouldRender] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (!hydrated) return;
    if (getOnboardingCompleted()) {
      router.replace("/dashboard");
      return;
    }
    setShouldRender(true);
  }, [hydrated, router]);

  const goNext = useCallback(() => {
    setStep(((state.step + 1) as OnboardingStep) > 3 ? 3 : ((state.step + 1) as OnboardingStep));
  }, [setStep, state.step]);

  const goBack = useCallback(() => {
    if (state.step <= 1) return;
    setStep((state.step - 1) as OnboardingStep);
  }, [setStep, state.step]);

  const handleJumpTo = useCallback(
    (target: OnboardingStep) => {
      if (target < state.step) setStep(target);
    },
    [setStep, state.step],
  );

  const handleSelectRole = useCallback(
    (roleId: RoleId) => {
      setRoleId(roleId);
    },
    [setRoleId],
  );

  const handleComplete = useCallback(
    (systemId: string, prompt: string) => {
      setOnboardingCompleted();
      // Hand off to the editor. The systemId is real; the prompt is forwarded
      // so the agent fires the build in the editor (the magic-moment beat).
      clearOnboardingState();
      const q = new URLSearchParams({ prompt }).toString();
      router.replace(`/systems/${encodeURIComponent(systemId)}?${q}`);
    },
    [router],
  );

  if (!shouldRender) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="t-caption text-[#8E8E93]">Preparing your workspace...</span>
      </div>
    );
  }

  const firstName =
    typeof user?.firstName === "string" && user.firstName.length > 0
      ? user.firstName
      : null;

  return (
    <AnimatePresence mode="wait">
      {state.step === 1 && (
        <OnboardingStepRole
          key="step-1"
          step={1}
          roleId={state.roleId}
          onSelect={handleSelectRole}
          onContinue={goNext}
          onJumpTo={handleJumpTo}
        />
      )}
      {state.step === 2 && (
        <OnboardingStepStarter
          key="step-2"
          step={2}
          roleId={state.roleId}
          starterId={state.starterId}
          onSelect={setStarterId}
          onContinue={goNext}
          onBack={goBack}
          onJumpTo={handleJumpTo}
        />
      )}
      {state.step === 3 && (
        <OnboardingStepLaunch
          key="step-3"
          step={3}
          starterId={state.starterId}
          workspaceName={state.workspaceName}
          onJumpTo={handleJumpTo}
          onComplete={handleComplete}
        />
      )}
    </AnimatePresence>
  );
}
