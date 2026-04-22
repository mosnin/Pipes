import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PIPES_USE_MOCKS: z.string().default("true").transform((value) => value === "true"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  CONVEX_DEPLOYMENT: z.string().optional(),
  CONVEX_URL: z.string().url().optional(),
  CREEM_API_KEY: z.string().optional(),
  CREEM_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  PIPES_ADMIN_ALLOWLIST: z.string().optional()
});

export const env = envSchema.parse(process.env);

export const runtimeFlags = {
  useMocks: env.PIPES_USE_MOCKS,
  hasAuth0: Boolean(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET),
  hasConvex: Boolean(env.CONVEX_URL),
  hasCreem: Boolean(env.CREEM_API_KEY),
  hasResend: Boolean(env.RESEND_API_KEY),
  hasOpenAI: Boolean(env.OPENAI_API_KEY)
};

export type EffectiveRuntimeMode = "mock" | "provider" | "fallback_mock";

export function resolveRuntimeMode(): { mode: EffectiveRuntimeMode; warning?: string } {
  if (env.PIPES_USE_MOCKS) return { mode: "mock" };
  const missing: string[] = [];
  if (!env.CONVEX_URL) missing.push("CONVEX_URL");
  if (!(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET)) missing.push("AUTH0_DOMAIN/AUTH0_CLIENT_ID/AUTH0_CLIENT_SECRET");
  if (missing.length > 0) {
    return { mode: "fallback_mock", warning: `Provider mode requested but incomplete configuration detected: ${missing.join(", ")}. Using mock runtime path.` };
  }
  return { mode: "provider" };
}
