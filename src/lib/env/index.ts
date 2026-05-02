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
  CLERK_SECRET_KEY: optionalString,
  CLERK_PUBLISHABLE_KEY: optionalString,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalString,
  CONVEX_DEPLOYMENT: optionalString,
  CONVEX_URL: optionalUrl,
  CREEM_API_KEY: optionalString,
  CREEM_WEBHOOK_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  MODAL_EXECUTOR_URL: optionalUrl,
  MODAL_EXECUTOR_TOKEN: optionalString,
  PIPES_ADMIN_ALLOWLIST: optionalString
});

export function buildEnv(source: NodeJS.ProcessEnv) {
  return envSchema.parse(source);
}

export const env = buildEnv(process.env);

export const runtimeFlags = {
  useMocks: env.PIPES_USE_MOCKS,
  hasClerk: Boolean(env.CLERK_SECRET_KEY && (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? env.CLERK_PUBLISHABLE_KEY)),
  hasConvex: Boolean(env.CONVEX_URL),
  hasCreem: Boolean(env.CREEM_API_KEY),
  hasResend: Boolean(env.RESEND_API_KEY),
  hasOpenAI: Boolean(env.OPENAI_API_KEY),
  hasModal: Boolean(env.MODAL_EXECUTOR_URL)
};

export type EffectiveRuntimeMode = "mock" | "provider" | "fallback_mock";

export function resolveRuntimeMode(): { mode: EffectiveRuntimeMode; warning?: string } {
  if (env.PIPES_USE_MOCKS) return { mode: "mock" };
  const missing: string[] = [];
  if (!env.CONVEX_URL) missing.push("CONVEX_URL");
  if (!(env.CLERK_SECRET_KEY && (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? env.CLERK_PUBLISHABLE_KEY))) missing.push("CLERK_SECRET_KEY/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (missing.length > 0) {
    return { mode: "fallback_mock", warning: `Provider mode requested but incomplete configuration detected: ${missing.join(", ")}. Using mock runtime path.` };
  }
  return { mode: "provider" };
}
