// localStorage-gated counters and one-shot flags for the editor's
// in-canvas tutorial and the NPS prompt. Pure helpers. Every read is guarded
// with a typeof window check so SSR pages stay happy.

export const KEYS = {
  TUTORIAL_SEEN: "looper-tutorial-seen",
  TUTORIAL_PILL_PREFIX: "looper-tutorial-seen-",
  NPS_SEEN: "pipes-nps-seen",
  BUILD_COUNT: "pipes-build-count",
  MENTAL_MODEL_SEEN: "pipes-mental-model-seen",
  ONBOARDING_COMPLETED: "pipes-onboarding-completed",
} as const;

export function getTutorialSeen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEYS.TUTORIAL_SEEN) === "true";
}

export function setTutorialSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.TUTORIAL_SEEN, "true");
}

export function getTutorialPillSeen(pillId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`${KEYS.TUTORIAL_PILL_PREFIX}${pillId}`) === "true";
}

export function setTutorialPillSeen(pillId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${KEYS.TUTORIAL_PILL_PREFIX}${pillId}`, "true");
}

export function getNpsSeen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEYS.NPS_SEEN) === "true";
}

export function setNpsSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.NPS_SEEN, "true");
}

export function getBuildCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(KEYS.BUILD_COUNT);
  const n = Number(raw ?? "0");
  return Number.isFinite(n) ? n : 0;
}

export function incrementBuildCount(): number {
  if (typeof window === "undefined") return 0;
  const next = getBuildCount() + 1;
  localStorage.setItem(KEYS.BUILD_COUNT, String(next));
  return next;
}

export function getMentalModelSeen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEYS.MENTAL_MODEL_SEEN) === "true";
}

export function setMentalModelSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.MENTAL_MODEL_SEEN, "true");
}

export function getOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEYS.ONBOARDING_COMPLETED) === "true";
}

export function setOnboardingCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.ONBOARDING_COMPLETED, "true");
}
