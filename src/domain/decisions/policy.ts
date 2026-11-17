/**
 * Truth tables that turn a decision model's probabilities into an action.
 * Pure. The thresholds are starting points from the sources Pipes studied and
 * are not calibrated yet; the Decisions page shows how each band performs as
 * receipts are labelled, so they can be tuned (docs/decisions.md).
 */
import type { Answer, ChoiceAnswer, NoulAnswer } from "@/lib/ai/openrouter/client";
import type { Consequence, DecisionAction, DecisionMode } from "@/domain/decisions/types";

export const THRESHOLDS = {
  /** Lowest confidence at which a route may be taken without a person, by consequence. */
  auto: { low: 0.7, medium: 0.85, high: Infinity } as Record<Consequence, number>,
  /** Lowest confidence worth showing as a suggestion. */
  suggest: 0.4,
  /** Below this, "does any option fit" means no, and a person decides. */
  noFit: 0.3,
  /** At or above this, "does any option fit" means yes. */
  fits: 0.8,
  /** Enough evidence to act on. */
  evidence: 0.7,
  /** doneWhen checks: met at or above, not met at or below; between is unsure. */
  met: 0.8,
  notMet: 0.2
};

export const asChoice = (a?: Answer) => (a?.type === "choice" ? (a as ChoiceAnswer) : undefined);
export const asNoul = (a?: Answer) => (a?.type === "noul" ? (a as NoulAnswer).noul : undefined);

export type PolicyResult = { action: DecisionAction; choice?: string; confidence?: number; reason: string };

/** Route decisions: act, suggest, or hand to a person. The chosen option must still be a live route. */
export function routePolicy(answers: Record<string, Answer>, input: { mode: DecisionMode; consequence: Consequence; liveOptions: string[] }): PolicyResult {
  const route = asChoice(answers.route);
  const fits = asNoul(answers.fits);
  const evidence = asNoul(answers.enough_evidence);
  if (!route || !input.liveOptions.includes(route.choice)) return { action: "fallback", reason: "The model's answer did not name one of the routes." };
  const base = { choice: route.choice, confidence: route.confidence };
  if (fits !== undefined && fits < THRESHOLDS.noFit) return { ...base, action: "human", reason: "None of the routes seems to fit this situation." };
  if (evidence !== undefined && evidence < THRESHOLDS.noFit) return { ...base, action: "human", reason: "The step does not have the information needed to choose." };
  const sure = route.confidence >= THRESHOLDS.auto[input.consequence] && (fits ?? 1) >= THRESHOLDS.fits && (evidence ?? 1) >= THRESHOLDS.evidence;
  if (sure && input.mode === "live") return { ...base, action: "auto", reason: `Confident (${Math.round(route.confidence * 100)}%) and the route fits.` };
  if (route.confidence >= THRESHOLDS.suggest) return { ...base, action: "suggest", reason: sure ? "Confident, but decisions are in shadow mode." : `Leaning this way (${Math.round(route.confidence * 100)}%), not sure enough to act.` };
  return { ...base, action: "human", reason: "Too unsure to suggest a route." };
}

/** Mapping a free-text outcome to a route: only act when the mapping is clear. */
export function outcomePolicy(answers: Record<string, Answer>, input: { mode: DecisionMode; liveOptions: string[] }): PolicyResult {
  const route = asChoice(answers.route);
  const fits = asNoul(answers.fits);
  if (!route || !input.liveOptions.includes(route.choice)) return { action: "fallback", reason: "The model's answer did not name one of the routes." };
  const base = { choice: route.choice, confidence: route.confidence };
  if ((fits ?? 0) < THRESHOLDS.fits || route.confidence < THRESHOLDS.auto.medium) return { ...base, action: "suggest", reason: "The outcome does not clearly match one route." };
  return input.mode === "live" ? { ...base, action: "auto", reason: "The outcome clearly matches this route." } : { ...base, action: "suggest", reason: "Clear match, but decisions are in shadow mode." };
}

/** doneWhen checks never act; they flag. */
export function doneWhenVerdict(probability: number | undefined): "met" | "not_met" | "unsure" {
  if (probability === undefined) return "unsure";
  if (probability >= THRESHOLDS.met) return "met";
  if (probability <= THRESHOLDS.notMet) return "not_met";
  return "unsure";
}
