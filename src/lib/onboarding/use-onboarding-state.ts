"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ONBOARDING_STATE,
  type OnboardingState,
  type RoleId,
  readOnboardingState,
  writeOnboardingState,
} from "./storage";

export type OnboardingStep = OnboardingState["step"];

export type UseOnboardingState = {
  state: OnboardingState;
  hydrated: boolean;
  setStep: (step: OnboardingStep) => void;
  setRoleId: (roleId: RoleId) => void;
  setWorkspaceName: (name: string) => void;
  setStarterId: (id: string) => void;
  reset: () => void;
};

// Single source of truth for the four-step onboarding wizard. Hydrates once
// from localStorage, then mirrors every mutation back out so a refresh resumes
// at the same step with the same selections.
export function useOnboardingState(): UseOnboardingState {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readOnboardingState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeOnboardingState(state);
  }, [state, hydrated]);

  const setStep = useCallback((step: OnboardingStep) => {
    setState((prev) => (prev.step === step ? prev : { ...prev, step }));
  }, []);

  const setRoleId = useCallback((roleId: RoleId) => {
    setState((prev) => ({ ...prev, roleId }));
  }, []);

  const setWorkspaceName = useCallback((workspaceName: string) => {
    setState((prev) => ({ ...prev, workspaceName }));
  }, []);

  const setStarterId = useCallback((starterId: string) => {
    setState((prev) => ({ ...prev, starterId }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_ONBOARDING_STATE);
  }, []);

  return {
    state,
    hydrated,
    setStep,
    setRoleId,
    setWorkspaceName,
    setStarterId,
    reset,
  };
}
