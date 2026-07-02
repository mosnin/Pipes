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
  LOOPER_USE_MOCKS: z.string().default("true").transform((value) => value === "true"),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:3000")),
  CLERK_SECRET_KEY: optionalString,
  CLERK_PUBLISHABLE_KEY: optionalString,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalString,
  CONVEX_DEPLOYMENT: optionalString,
  CONVEX_URL: optionalUrl,
  PADDLE_API_KEY: optionalString,
  PADDLE_WEBHOOK_SECRET: optionalString,
  PADDLE_ENVIRONMENT: optionalString,
  PADDLE_CLIENT_TOKEN: optionalString,
  RESEND_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  OPENAI_AGENTS_MODEL: optionalString,
  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_MODEL: optionalString,
  OPENROUTER_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().default("https://openrouter.ai/api/v1")),
  PADDLE_PRICE_PRO: optionalString,
  PADDLE_PRICE_BUILDER: optionalString,
  X402_FACILITATOR_URL: optionalUrl,
  X402_PAY_TO_ADDRESS: optionalString,
  X402_NETWORK: optionalString,
  X402_ASSET_ADDRESS: optionalString,
  MODAL_EXECUTOR_URL: optionalUrl,
  MODAL_EXECUTOR_TOKEN: optionalString,
  LOOPER_AGENT_ENDPOINT_URL: optionalUrl,
  LOOPER_ADMIN_ALLOWLIST: optionalString
});

export function buildEnv(source: NodeJS.ProcessEnv) {
  return envSchema.parse(source);
}

export const env = buildEnv(process.env);

export const runtimeFlags = {
  useMocks: env.LOOPER_USE_MOCKS,
  hasClerk: Boolean(env.CLERK_SECRET_KEY && (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? env.CLERK_PUBLISHABLE_KEY)),
  hasConvex: Boolean(env.CONVEX_URL),
  hasPaddle: Boolean(env.PADDLE_API_KEY),
  hasResend: Boolean(env.RESEND_API_KEY),
  hasOpenAI: Boolean(env.OPENAI_API_KEY),
  hasOpenRouter: Boolean(env.OPENROUTER_API_KEY),
  hasX402Facilitator: Boolean(env.X402_FACILITATOR_URL),
  hasModal: Boolean(env.MODAL_EXECUTOR_URL),
  hasAgentRunner: Boolean(env.LOOPER_AGENT_ENDPOINT_URL)
};

export const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";

export type EffectiveRuntimeMode = "mock" | "provider" | "fallback_mock";

export function resolveRuntimeMode(): { mode: EffectiveRuntimeMode; warning?: string } {
  const isProduction = env.NODE_ENV === "production";

  if (env.LOOPER_USE_MOCKS) {
    if (isProduction) {
      // Mock mode bypasses all authentication and authorization.
      // Set LOOPER_STRICT_PRODUCTION=true to turn this warning into a hard failure
      // once a proper production deployment is configured.
      if (process.env.LOOPER_STRICT_PRODUCTION === "true") {
        throw new Error(
          "LOOPER_USE_MOCKS=true is not allowed when LOOPER_STRICT_PRODUCTION=true. " +
          "Disable mock mode or remove the strict flag."
        );
      }
      console.error("[SECURITY] LOOPER_USE_MOCKS=true in production — all authentication is bypassed. Set LOOPER_STRICT_PRODUCTION=true to block this.");
    }
    return { mode: "mock" };
  }

  const missing: string[] = [];
  if (!env.CONVEX_URL) missing.push("CONVEX_URL");
  if (!(env.CLERK_SECRET_KEY && (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? env.CLERK_PUBLISHABLE_KEY))) missing.push("CLERK_SECRET_KEY/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (missing.length > 0) {
    return { mode: "fallback_mock", warning: `Provider mode requested but incomplete configuration detected: ${missing.join(", ")}. Using mock runtime path.` };
  }
  return { mode: "provider" };
}
