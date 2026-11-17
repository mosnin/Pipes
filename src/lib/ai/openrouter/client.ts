import { env } from "@/lib/env";

/**
 * OpenRouter, for Pipes' decisions (docs/decisions.md).
 *
 * Two endpoints:
 * - fast ("system 1"): POST /api/alpha/decisions, a decision model such as
 *   typesafe/jev-1.14. It never writes text: it returns a probability for each
 *   option of a choice, a position on a score, or the probability a statement
 *   is true (noul).
 * - deliberate ("system 2"): POST /api/v1/chat/completions with a strict JSON
 *   schema, an LLM that also gives a rationale and evidence.
 *
 * Both retry 429 and 5xx a little, honour a deadline, and report cost in
 * integer micro-dollars. A failure is an error, never a "no".
 */

export type ChoiceQuestion = { type: "choice"; instructions: string; criteria: Record<string, string> };
export type NoulQuestion = { type: "noul"; instructions: string };
export type ScoreQuestion = { type: "score"; instructions: string; criteria: string[] };
export type Question = ChoiceQuestion | NoulQuestion | ScoreQuestion;

export type ChoiceAnswer = { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> };
export type NoulAnswer = { type: "noul"; noul: number };
export type ScoreAnswer = { type: "score"; score: number; confidence: number; probabilities: Record<string, number> };
export type Answer = ChoiceAnswer | NoulAnswer | ScoreAnswer;

export type DecideResult = { answers: Record<string, Answer>; model: string; costMicros: number; latencyMs: number };
export type DeliberateResult = { json: unknown; model: string; costMicros: number; latencyMs: number };

export class DeciderError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

const DEFAULT_FAST = "typesafe/jev-1.14";

export function deciderConfig() {
  const list = (value: string | undefined, fallback: string[]) => (value ? value.split(",").map((s) => s.trim()).filter(Boolean) : fallback);
  const num = (value: string | undefined, fallback: number) => (value && Number.isFinite(Number(value)) ? Number(value) : fallback);
  return {
    mode: env.PIPES_DECISIONS,
    live: Boolean(env.OPENROUTER_API_KEY),
    base: (env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api").replace(/\/$/, ""),
    fastModels: list(env.PIPES_DECIDER_FAST_MODELS, [DEFAULT_FAST]),
    deliberateModels: list(env.PIPES_DECIDER_DELIBERATE_MODELS, []),
    fastTimeoutMs: num(env.PIPES_DECIDER_FAST_TIMEOUT_MS, 1500),
    deliberateTimeoutMs: num(env.PIPES_DECIDER_DELIBERATE_TIMEOUT_MS, 12000),
    maxCostMicros: num(env.PIPES_DECIDER_MAX_COST_MICROS, 20000)
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(url: string, body: unknown, timeoutMs: number): Promise<{ json: any; latencyMs: number }> {
  let delay = 250;
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "content-type": "application/json",
          "x-title": "Pipes",
          "http-referer": env.NEXT_PUBLIC_APP_URL
        },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      if (res.status === 429 || res.status >= 500) {
        lastError = `OpenRouter answered ${res.status}`;
        if (attempt < 2) {
          await sleep(delay);
          delay *= 2;
          continue;
        }
        throw new DeciderError(lastError, res.status);
      }
      if (!res.ok) throw new DeciderError(`OpenRouter answered ${res.status}: ${text.slice(0, 300)}`, res.status);
      try {
        return { json: JSON.parse(text), latencyMs: Date.now() - started };
      } catch {
        throw new DeciderError("OpenRouter returned something that is not JSON.", res.status);
      }
    } catch (error) {
      if (error instanceof DeciderError) throw error;
      lastError = controller.signal.aborted ? `No answer within ${timeoutMs}ms` : (error as Error).message;
      if (controller.signal.aborted) throw new DeciderError(lastError);
      if (attempt < 2) {
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw new DeciderError(lastError);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new DeciderError(lastError || "OpenRouter could not be reached.");
}

const micros = (usd: unknown) => (typeof usd === "number" && Number.isFinite(usd) ? Math.round(usd * 1_000_000) : 0);

/** One fast decision, trying each configured model in turn when one fails. */
export async function decideFast(state: unknown, questions: Record<string, Question>): Promise<DecideResult> {
  const config = deciderConfig();
  let last: unknown;
  for (const model of config.fastModels) {
    try {
      const { json, latencyMs } = await post(`${config.base}/alpha/decisions`, { model, state, questions }, config.fastTimeoutMs);
      if (!json?.answers || typeof json.answers !== "object") throw new DeciderError("The decision had no answers.");
      return { answers: json.answers as Record<string, Answer>, model: String(json.model ?? model), costMicros: micros(json.usage?.cost), latencyMs };
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new DeciderError("No fast decision model answered.");
}

/** One deliberate answer: an LLM asked for JSON matching `schema`. */
export async function deliberate(system: string, user: string, schema: Record<string, unknown>): Promise<DeliberateResult> {
  const config = deciderConfig();
  if (config.deliberateModels.length === 0) throw new DeciderError("No deliberate model is configured (PIPES_DECIDER_DELIBERATE_MODELS).");
  const { json, latencyMs } = await post(
    `${config.base}/v1/chat/completions`,
    {
      model: config.deliberateModels[0],
      models: config.deliberateModels,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: { type: "json_schema", json_schema: { name: "decision", strict: true, schema } },
      provider: { require_parameters: true, data_collection: "deny" },
      usage: { include: true }
    },
    config.deliberateTimeoutMs
  );
  const content = json?.choices?.[0]?.message?.content;
  let parsed: unknown;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    throw new DeciderError("The deliberate model did not return JSON.");
  }
  return { json: parsed, model: String(json?.model ?? config.deliberateModels[0]), costMicros: micros(json?.usage?.cost), latencyMs };
}
