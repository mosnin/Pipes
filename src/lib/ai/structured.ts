import type { ZodType, infer as ZodInfer } from "zod";
import { env, runtimeFlags, DEFAULT_OPENROUTER_MODEL } from "@/lib/env";

// ---------------------------------------------------------------------------
// generateStructured — the single structured-JSON generation primitive.
//
// Every "describe something in natural language, get back a Zod-validated JSON
// object" feature (system drafts, the skill compiler, the DAG planner) is the
// same call: pick a provider, hit an OpenAI-compatible chat-completions
// endpoint asking for strict JSON, parse it, validate it against a schema, and
// fall back to a deterministic mock when no provider is configured. This is
// that call, written once. Add a feature by supplying a prompt, a schema, and a
// mock — not another copy of the fetch/parse/validate dance.
// ---------------------------------------------------------------------------

export type StructuredRequest<S extends ZodType> = {
  /** System prompt: role + output contract. */
  system: string;
  /** User message: the actual input to transform. */
  user: string;
  /** Schema the model output must satisfy. Doubles as the return type. */
  schema: S;
  /** Deterministic result used in mock mode or when no provider is set. */
  mock: () => ZodInfer<S> | Promise<ZodInfer<S>>;
  /** Sampling temperature. Lower = more deterministic structure. */
  temperature?: number;
  /** OpenRouter X-Title for attribution. */
  title?: string;
};

/** Strip markdown code fences a model may wrap JSON in, then parse — guarded. */
function parseJson(text: string): unknown {
  const cleaned = text.replace(/```json\n?|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Model returned malformed JSON.");
  }
}

function contentOf(body: unknown): string {
  const choice = (body as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0];
  const content = choice?.message?.content;
  return typeof content === "string" ? content : "{}";
}

async function viaOpenRouter<S extends ZodType>(req: StructuredRequest<S>): Promise<unknown> {
  const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "X-Title": req.title ?? "Looper",
      "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
      temperature: req.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openrouter_${res.status}`);
  return parseJson(contentOf(await res.json()));
}

async function viaOpenAi<S extends ZodType>(req: StructuredRequest<S>): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      temperature: req.temperature ?? 0.2,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai_${res.status}`);
  return parseJson(contentOf(await res.json()));
}

export async function generateStructured<S extends ZodType>(
  req: StructuredRequest<S>,
): Promise<ZodInfer<S>> {
  if (runtimeFlags.hasOpenRouter) return req.schema.parse(await viaOpenRouter(req));
  if (!runtimeFlags.useMocks && runtimeFlags.hasOpenAI) return req.schema.parse(await viaOpenAi(req));
  return req.mock();
}
