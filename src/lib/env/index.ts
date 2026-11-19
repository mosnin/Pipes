import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PIPES_USE_MOCKS: z.string().default("true").transform((value) => value === "true"),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:3000")),
  AUTH0_DOMAIN: optionalString,
  AUTH0_CLIENT_ID: optionalString,
  AUTH0_CLIENT_SECRET: optionalString,
  AUTH0_AUDIENCE: optionalString,
  CONVEX_DEPLOYMENT: optionalString,
  CONVEX_URL: optionalUrl,
  CREEM_API_KEY: optionalString,
  CREEM_WEBHOOK_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  MODAL_EXECUTOR_URL: optionalUrl,
  MODAL_EXECUTOR_TOKEN: optionalString,
  PIPES_ADMIN_ALLOWLIST: optionalString,
  PIPES_SESSION_SECRET: optionalString,
  // Decision models through OpenRouter (docs/decisions.md).
  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_BASE_URL: optionalUrl,
  PIPES_DECISIONS: z.preprocess(emptyToUndefined, z.enum(["off", "shadow", "live"]).default("shadow")),
  PIPES_DECIDER_FAST_MODELS: optionalString,
  PIPES_DECIDER_DELIBERATE_MODELS: optionalString,
  PIPES_DECIDER_FAST_TIMEOUT_MS: optionalString,
  PIPES_DECIDER_DELIBERATE_TIMEOUT_MS: optionalString,
  PIPES_DECIDER_MAX_COST_MICROS: optionalString,
  // Agent memory recall through Supermemory (docs/memory.md). Pipes' own records stay the source of truth.
  PIPES_MEMORY_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["local", "supermemory"]).default("local")),
  SUPERMEMORY_API_KEY: optionalString,
  /** Point at the Cloudflare memory gateway (cloudflare/memory-gateway) instead of Supermemory directly. */
  SUPERMEMORY_BASE_URL: optionalUrl,
  /** Shared secret for signing requests to the Cloudflare memory gateway. */
  PIPES_MEMORY_GATEWAY_SECRET: optionalString
});

export function buildEnv(source: NodeJS.ProcessEnv) {
  return envSchema.parse(source);
}

export const env = buildEnv(process.env);

export const runtimeFlags = {
  useMocks: env.PIPES_USE_MOCKS,
  hasAuth0: Boolean(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET),
  hasConvex: Boolean(env.CONVEX_URL),
  hasCreem: Boolean(env.CREEM_API_KEY),
  hasResend: Boolean(env.RESEND_API_KEY),
  hasOpenAI: Boolean(env.OPENAI_API_KEY),
  hasOpenRouter: Boolean(env.OPENROUTER_API_KEY),
  hasSupermemory: env.PIPES_MEMORY_PROVIDER === "supermemory" && Boolean(env.SUPERMEMORY_API_KEY || (env.SUPERMEMORY_BASE_URL && env.PIPES_MEMORY_GATEWAY_SECRET)),
  hasModal: Boolean(env.MODAL_EXECUTOR_URL)
};

export type EffectiveRuntimeMode = "mock" | "provider" | "fallback_mock";

export function resolveRuntimeMode(): { mode: EffectiveRuntimeMode; warning?: string } {
  if (env.PIPES_USE_MOCKS) return { mode: "mock" };
  if (!env.CONVEX_URL) {
    return { mode: "fallback_mock", warning: "Provider mode requested but CONVEX_URL is not set. Using the local file-backed store." };
  }
  return { mode: "provider" };
}
