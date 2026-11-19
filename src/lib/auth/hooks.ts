import crypto from "node:crypto";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { symmetricDecrypt } from "better-auth/crypto";
import { createSecurityService, requestMeta, type SecurityService } from "@/domain/auth/security";
import { hashRecoveryCode } from "@/lib/auth/totp";
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { normalizeEmail, validatePasswordStrength } from "@/lib/auth/password";
import type { RepositorySet } from "@/lib/repositories/contracts";

/**
 * What Better Auth does not do and Pipes promises (docs/security.md), as
 * Better Auth hooks. Each path here is covered by tests/unit/better-auth.test.ts,
 * because a mistyped path would fail open.
 */

const TOTP_REUSE_KIND = "totp_used";
const TOTP_REUSE_MS = 90_000;

type Ctx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];
type UserLike = { id?: string; email?: string; externalId?: string | null; twoFactorEnabled?: boolean | null };

const ext = (u?: UserLike | null) => u?.externalId ?? undefined;
const metaOf = (ctx: Ctx) => requestMeta(ctx.headers ?? new Headers());
const failedStatus = (ctx: Ctx): number | null => {
  const r = ctx.context.returned as { statusCode?: number; status?: number } | Response | undefined;
  if (!r) return null;
  if (r instanceof Response) return r.status >= 400 ? r.status : null;
  const code = r.statusCode ?? (typeof r.status === "number" ? r.status : undefined);
  return code && code >= 400 ? code : null;
};

/**
 * Whether `code` is a current code for the user's authenticator, checked the
 * way Better Auth checks it: its own secrets are used as raw key bytes, and
 * secrets imported from Pipes' earlier sign-in are stored as `base32:<secret>`.
 */
async function codeMatches(ctx: Ctx, userId: string, code: string): Promise<boolean> {
  const row = await ctx.context.adapter.findOne<{ secret: string }>({ model: "twoFactor", where: [{ field: "userId", value: userId }] });
  if (!row?.secret || !/^\d{6}$/.test(code)) return false;
  const plain = await symmetricDecrypt({ key: ctx.context.secretConfig, data: row.secret });
  const secret = plain.startsWith("base32:") ? base32.decode(plain.slice(7).toUpperCase()) : plain;
  return createOTP(secret, { period: 30, digits: 6 }).verify(code);
}

export function beforeHook(security: SecurityService) {
  return createAuthMiddleware(async (ctx) => {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    switch (ctx.path) {
      case "/sign-in/email": {
        // Lockout comes before the password is checked, so a locked account gives nothing away.
        const email = normalizeEmail(String(body.email ?? ""));
        const lock = await security.lockState(email);
        if (lock.locked) throw new APIError("LOCKED", { message: "This account is locked after too many failed attempts. Try again later, or reset your password.", code: "ACCOUNT_LOCKED" });
        return;
      }
      case "/sign-up/email": {
        const weak = validatePasswordStrength(String(body.password ?? ""), String(body.email ?? ""));
        if (weak) throw new APIError("BAD_REQUEST", { message: weak, code: "WEAK_PASSWORD" });
        return;
      }
      case "/change-password":
      case "/reset-password": {
        const session = ctx.path === "/change-password" ? await getSessionFromCtx(ctx) : null;
        const weak = validatePasswordStrength(String(body.newPassword ?? ""), session?.user.email);
        if (weak) throw new APIError("BAD_REQUEST", { message: weak, code: "WEAK_PASSWORD" });
        // A password change always signs out every other session.
        if (ctx.path === "/change-password") return { context: { body: { ...body, revokeOtherSessions: true } } };
        return;
      }
      case "/two-factor/verify-backup-code": {
        // Recovery codes are stored only as hashes, so compare hashes.
        if (typeof body.code === "string") return { context: { body: { ...body, code: hashRecoveryCode(body.code) } } };
        return;
      }
      case "/two-factor/disable": {
        // Turning two-step off needs a current code as well as the password, so a stolen session and password are not enough.
        const session = await getSessionFromCtx(ctx);
        if (!session) return;
        const code = String(body.code ?? "").replace(/\s+/g, "");
        const ok = await codeMatches(ctx, session.user.id, code);
        const recovery = !ok && code ? await ctx.context.adapter.findOne<{ backupCodes: string }>({ model: "twoFactor", where: [{ field: "userId", value: session.user.id }] }) : null;
        const recoveryOk = recovery ? (JSON.parse(recovery.backupCodes || "[]") as string[]).includes(hashRecoveryCode(code)) : false;
        if (!ok && !recoveryOk) throw new APIError("BAD_REQUEST", { message: "Enter a current code from your app, or a recovery code, to turn two-step sign-in off.", code: "CODE_REQUIRED" });
        const { code: _drop, ...rest } = body;
        return { context: { body: rest } };
      }
    }
  });
}

export function afterHook(security: SecurityService, repos: RepositorySet) {
  return createAuthMiddleware(async (ctx) => {
    const meta = metaOf(ctx);
    const failed = failedStatus(ctx);
    const created = ctx.context.newSession as { session: { token: string }; user: UserLike } | null | undefined;
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    switch (ctx.path) {
      case "/sign-up/email":
        if (created) await security.record({ type: "signup", externalId: ext(created.user), email: created.user.email, ...meta });
        return;
      case "/sign-in/email": {
        const email = normalizeEmail(String(body.email ?? ""));
        if (failed === 401) {
          await security.recordFailure(email, meta);
          return;
        }
        if (created) {
          await security.recordSuccess(email);
          // With two-step on, Better Auth swaps this session for a challenge after this hook runs.
          await security.record({ type: created.user.twoFactorEnabled ? "mfa.challenged" : "login.succeeded", externalId: ext(created.user), email, ...meta, detail: { mfa: false } });
        }
        return;
      }
      case "/two-factor/verify-totp":
      case "/two-factor/verify-backup-code": {
        if (failed) {
          await security.record({ type: "mfa.failed", ...meta });
          return;
        }
        if (!created) return;
        const userId = created.user.id ?? "";
        if (ctx.path === "/two-factor/verify-totp" && typeof body.code === "string") {
          // Each code works once: Better Auth accepts a code for its whole window, Pipes does not.
          const id = crypto.createHash("sha256").update(`${userId}:${body.code.replace(/\s+/g, "")}`).digest("hex").slice(0, 40);
          const seen = await repos.documents.get<{ at: number }>(TOTP_REUSE_KIND, id);
          if (seen && Date.now() - seen.data.at < TOTP_REUSE_MS) {
            await ctx.context.internalAdapter.deleteSession(created.session.token);
            await security.record({ type: "mfa.failed", externalId: ext(created.user), email: created.user.email, ...meta, detail: { reason: "code_reused" } });
            throw new APIError("UNAUTHORIZED", { message: "That code was already used. Wait for the next one.", code: "CODE_REUSED" });
          }
          await repos.documents.put({ kind: TOTP_REUSE_KIND, id, workspaceId: "global", data: { at: Date.now() } });
        }
        await security.record({ type: ctx.path.endsWith("backup-code") ? "mfa.recovery_used" : "login.succeeded", externalId: ext(created.user), email: created.user.email, ...meta, detail: { mfa: true } });
        return;
      }
      case "/two-factor/enable":
        if (!failed) {
          const s = await getSessionFromCtx(ctx);
          await security.record({ type: "mfa.enabled", externalId: ext(s?.user as UserLike), email: s?.user.email, ...meta });
        }
        return;
      case "/two-factor/disable":
        if (!failed) {
          const s = await getSessionFromCtx(ctx);
          await security.record({ type: "mfa.disabled", externalId: ext(s?.user as UserLike), email: s?.user.email, ...meta });
        }
        return;
      case "/change-password":
        if (!failed) {
          const s = await getSessionFromCtx(ctx);
          await security.record({ type: "password.changed", externalId: ext(s?.user as UserLike), email: s?.user.email, ...meta });
        }
        return;
      case "/request-password-reset":
        await security.record({ type: "password.reset_requested", email: typeof body.email === "string" ? normalizeEmail(body.email) : undefined, ...meta });
        return;
      case "/revoke-session":
        if (!failed) await security.record({ type: "session.revoked", ...(await who(ctx)), ...meta });
        return;
      case "/revoke-other-sessions":
      case "/revoke-sessions":
        if (!failed) await security.record({ type: "session.revoked_all", ...(await who(ctx)), ...meta });
        return;
    }
  });
}

async function who(ctx: Ctx): Promise<{ externalId?: string; email?: string }> {
  const s = await getSessionFromCtx(ctx).catch(() => null);
  return { externalId: ext(s?.user as UserLike), email: s?.user.email };
}

export { createSecurityService };
