import crypto from "node:crypto";
import type { BetterAuthOptions } from "better-auth";
import { hashPassword as baHash, verifyPassword as baVerify } from "better-auth/crypto";
import { twoFactor } from "better-auth/plugins/two-factor";
import { genericOAuth, auth0 } from "better-auth/plugins/generic-oauth";
import { createSecurityService } from "@/domain/auth/security";
import { afterHook, beforeHook } from "@/lib/auth/hooks";
import { verifyPassword as legacyVerify } from "@/lib/auth/password";
import { hashRecoveryCode, newRecoveryCodes } from "@/lib/auth/totp";
import { authSchemaOptions } from "@/lib/auth/schema-options";
import type { RepositorySet } from "@/lib/repositories/contracts";

/**
 * Pipes' Better Auth configuration (docs/security.md). One factory for every
 * mode; only the database differs: Convex through a serverKey bridge in
 * production, a SQLite file without Convex, SQLite in memory in tests.
 */
export type AuthDeps = {
  database: BetterAuthOptions["database"];
  repos: RepositorySet;
  baseURL: string;
  secret: string;
  production: boolean;
  sendPasswordReset?: (input: { email: string; name?: string; resetUrl: string }) => Promise<unknown>;
  auth0?: { clientId: string; clientSecret: string; domain: string };
};

export function buildAuthOptions(deps: AuthDeps) {
  const security = createSecurityService(deps.repos);
  return {
    ...authSchemaOptions,
    baseURL: deps.baseURL,
    basePath: "/api/auth",
    secret: deps.secret,
    database: deps.database,
    trustedOrigins: [deps.baseURL],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 200,
      autoSignIn: true,
      // A reset proves the email, so every session for the account ends.
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      password: {
        hash: (password: string) => baHash(password),
        // Accounts from Pipes' earlier sign-in keep their scrypt hashes and keep working.
        verify: async ({ hash, password }: { hash: string; password: string }) => (hash.startsWith("scrypt$") ? legacyVerify(password, hash) : baVerify({ hash, password }))
      },
      sendResetPassword: async ({ user, url }: { user: { email: string; name?: string }; url: string }) => {
        await deps.sendPasswordReset?.({ email: user.email, name: user.name, resetUrl: url });
      },
      onPasswordReset: async ({ user }: { user: { email: string; externalId?: string | null } }) => {
        await security.record({ type: "password.reset", externalId: user.externalId ?? undefined, email: user.email });
      }
    },
    session: {
      ...authSchemaOptions.session,
      // The longest any workspace allows; each workspace's own idle limit is applied per request (getServerApp).
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 5,
      freshAge: 60 * 60,
      // Always read the session from the database, so a revoked session ends at once.
      cookieCache: { enabled: false }
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      // Per IP address and path. Account lockout (hooks) covers guessing one account from many addresses.
      customRules: {
        "/sign-in/email": { window: 15 * 60, max: 30 },
        "/sign-up/email": { window: 15 * 60, max: 10 },
        "/request-password-reset": { window: 15 * 60, max: 5 },
        "/reset-password": { window: 15 * 60, max: 10 },
        "/change-password": { window: 15 * 60, max: 10 }
      },
      customStorage: {
        consume: async (key: string, rule: { window: number; max: number }) => {
          const r = await deps.repos.rateLimits.consume({ bucket: `auth:${key}`, windowSeconds: rule.window, limit: rule.max, now: new Date().toISOString() });
          return { allowed: r.allowed, retryAfter: r.allowed ? null : r.retryAfterSeconds };
        }
      }
    },
    advanced: {
      cookiePrefix: "pipes",
      // Always check Origin on state-changing requests. Better Auth skips it under test runners unless told.
      disableOriginCheck: false,
      useSecureCookies: deps.production,
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user: Record<string, unknown>) => ({ data: { ...user, externalId: (user.externalId as string | undefined) ?? `ba|${crypto.randomUUID()}` } }),
          // Every account gets its Pipes user and first workspace straight away, as before.
          after: async (user: Record<string, unknown>) => {
            await deps.repos.users.provision({ externalId: String(user.externalId), email: String(user.email), name: String(user.name || String(user.email).split("@")[0]) });
          }
        }
      },
      session: {
        create: {
          // Only a session started by the second step counts as two-step verified.
          before: async (session: Record<string, unknown>, ctx?: { path?: string } | null) => ({ data: { ...session, mfa: Boolean(ctx?.path?.startsWith("/two-factor/verify")) } })
        }
      }
    },
    hooks: { before: beforeHook(security), after: afterHook(security, deps.repos) },
    plugins: [
      twoFactor({
        issuer: "Pipes",
        totpOptions: { digits: 6, period: 30 },
        // Five minutes to enter the code after the password.
        twoFactorCookieMaxAge: 5 * 60,
        accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 15 * 60 },
        backupCodeOptions: {
          customBackupCodesGenerate: () => newRecoveryCodes(10),
          // Recovery codes are stored only as hashes (see the backup-code hook).
          storeBackupCodes: {
            encrypt: async (json: string) => JSON.stringify((JSON.parse(json) as string[]).map(hashRecoveryCode)),
            decrypt: async (stored: string) => stored
          }
        }
      }),
      ...(deps.auth0 ? [genericOAuth({ config: [auth0({ clientId: deps.auth0.clientId, clientSecret: deps.auth0.clientSecret, domain: deps.auth0.domain })] })] : [])
    ]
  } satisfies BetterAuthOptions;
}
