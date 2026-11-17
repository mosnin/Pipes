import type { Answer, DecideResult, DeliberateResult, Question } from "@/lib/ai/openrouter/client";

/**
 * A deterministic stand-in for the decision model, for mock mode and tests:
 * the overlap between the words in the state and each option's criteria
 * becomes a probability distribution. Same input, same answer, no network.
 */
const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);

function overlap(state: Set<string>, text: string) {
  let hits = 0;
  for (const w of words(text)) if (state.has(w)) hits++;
  return hits;
}

export function mockDecideFast(state: unknown, questions: Record<string, Question>): DecideResult {
  const stateWords = words(JSON.stringify(state ?? ""));
  const answers: Record<string, Answer> = {};
  for (const [id, q] of Object.entries(questions)) {
    if (q.type === "choice") {
      const labels = Object.keys(q.criteria);
      const raw = labels.map((label) => 1 + 3 * overlap(stateWords, `${label} ${q.criteria[label]}`));
      const total = raw.reduce((a, b) => a + b, 0);
      const probabilities = Object.fromEntries(labels.map((label, i) => [label, raw[i] / total]));
      const top = labels[raw.indexOf(Math.max(...raw))];
      const n = labels.length;
      const confidence = n > 1 ? (n * probabilities[top] - 1) / (n - 1) : 1;
      answers[id] = { type: "choice", choice: top, confidence: Math.max(0, Math.min(1, confidence)), probabilities };
    } else if (q.type === "noul") {
      const hits = overlap(stateWords, q.instructions);
      answers[id] = { type: "noul", noul: Math.min(0.95, 0.5 + hits * 0.08) };
    } else {
      const raw = q.criteria.map((level) => 1 + 3 * overlap(stateWords, level));
      const total = raw.reduce((a, b) => a + b, 0);
      const probabilities = Object.fromEntries(raw.map((v, i) => [String(i), v / total]));
      const score = raw.reduce((acc, v, i) => acc + (v / total) * i, 0);
      answers[id] = { type: "score", score, confidence: Math.max(...raw) / total, probabilities };
    }
  }
  return { answers, model: "mock/decider", costMicros: 0, latencyMs: 0 };
}

export function mockDeliberate(options: string[]): DeliberateResult {
  return {
    json: { choice: "needs_human", confidence: 0, rationale: "No deliberate model in mock mode.", evidence: [], missing_information: [] , options },
    model: "mock/deliberate",
    costMicros: 0,
    latencyMs: 0
  };
}
