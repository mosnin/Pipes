import { env } from "@/lib/env";

const DEV_SECRET = "pipes-dev-only-auth-secret-do-not-use-in-production";

/** Better Auth's secret: BETTER_AUTH_SECRET, else PIPES_SESSION_SECRET; a fixed one only outside production. */
export function authSecret(): string | undefined {
  const value = env.BETTER_AUTH_SECRET ?? env.PIPES_SESSION_SECRET;
  if (value && value.length >= 32) return value;
  return env.NODE_ENV === "production" ? undefined : DEV_SECRET;
}
