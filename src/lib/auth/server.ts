import "server-only";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { buildAuthOptions } from "@/lib/auth/options";
import { convexBridgeAdapter } from "@/lib/auth/convex-adapter";
import { getRepositories } from "@/lib/composition/repositories";
import { getEmailService } from "@/lib/email";
import { env, resolveRuntimeMode, runtimeFlags } from "@/lib/env";

/**
 * The Better Auth instance for this server. Accounts and sessions live in
 * Convex in production, or in a SQLite file when running real sign-in
 * without Convex (docs/security.md). Demo mode (PIPES_USE_MOCKS=true) never
 * creates one.
 */

const DEV_SECRET = "pipes-dev-only-auth-secret-do-not-use-in-production";

export function authSecret(): string | undefined {
  const value = env.BETTER_AUTH_SECRET ?? env.PIPES_SESSION_SECRET;
  if (value && value.length >= 32) return value;
  return env.NODE_ENV === "production" ? undefined : DEV_SECRET;
}

async function createAuth() {
  const secret = authSecret();
  if (!secret) throw new Error("BETTER_AUTH_SECRET (32+ characters) is required to sign people in in production.");
  const onConvex = resolveRuntimeMode().mode === "provider";
  // SQLite only when there is no Convex, loaded only then (and without an import a bundler would follow).
  const sqlite = onConvex ? null : (process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite"));
  const database = sqlite ? new sqlite.DatabaseSync(env.PIPES_AUTH_DB_FILE ?? ".pipes-auth.sqlite") : convexBridgeAdapter();
  const options = buildAuthOptions({
    database,
    repos: getRepositories(),
    baseURL: env.NEXT_PUBLIC_APP_URL,
    secret,
    production: env.NODE_ENV === "production",
    sendPasswordReset: (input) => getEmailService().sendPasswordReset(input),
    auth0: runtimeFlags.hasAuth0 ? { clientId: env.AUTH0_CLIENT_ID!, clientSecret: env.AUTH0_CLIENT_SECRET!, domain: env.AUTH0_DOMAIN! } : undefined
  });
  const auth = betterAuth(options);
  // SQLite tables are created on first use; Convex tables come from the Better Auth component.
  if (!onConvex) await (await getMigrations(options)).runMigrations();
  return auth;
}

export type PipesAuth = Awaited<ReturnType<typeof createAuth>>;
const g = globalThis as unknown as { __pipesAuth?: Promise<PipesAuth> };

/** The shared instance, ready to use. Created once per server process. */
export async function getAuth(): Promise<PipesAuth> {
  if (!g.__pipesAuth) g.__pipesAuth = createAuth().catch((error) => {
    g.__pipesAuth = undefined;
    throw error;
  });
  return g.__pipesAuth;
}
