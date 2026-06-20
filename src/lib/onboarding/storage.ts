// Local persistence for the post-signup onboarding wizard.
//
// Onboarding is four steps. The user can refresh between any of them and
// resume where they left off. We persist their selections in localStorage
// under a single namespaced key. Pure helpers. Every read is SSR-safe.

export const ONBOARDING_KEY = "looper-onboarding-state";

export const ROLE_IDS = [
  "multi-agent-systems",
  "customer-support",
  "data-pipelines",
  "internal-tools",
  "research",
  "other",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export type OnboardingState = {
  step: 1 | 2 | 3 | 4;
  roleId: RoleId | null;
  workspaceName: string;
  starterId: string | null;
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  step: 1,
  roleId: null,
  workspaceName: "",
  starterId: null,
};

function isRoleId(value: unknown): value is RoleId {
  return typeof value === "string" && (ROLE_IDS as readonly string[]).includes(value);
}

function coerceStep(value: unknown): OnboardingState["step"] {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  return 1;
}

export function readOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_ONBOARDING_STATE;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (raw == null) return DEFAULT_ONBOARDING_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object") {
      return DEFAULT_ONBOARDING_STATE;
    }
    const rec = parsed as Record<string, unknown>;
    return {
      step: coerceStep(rec.step),
      roleId: isRoleId(rec.roleId) ? rec.roleId : null,
      workspaceName:
        typeof rec.workspaceName === "string" ? rec.workspaceName : "",
      starterId:
        typeof rec.starterId === "string" && rec.starterId.length > 0
          ? rec.starterId
          : null,
    };
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

export function writeOnboardingState(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function clearOnboardingState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // ignore
  }
}
