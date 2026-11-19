import crypto from "node:crypto";
import { DECOY_HASH, hashPassword, isPlausibleEmail, normalizeEmail, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { hashRecoveryCode, newRecoveryCodes, newSecret, otpauthUrl, verifyCode } from "@/lib/auth/totp";
import { createSecurityService, type RequestMeta } from "@/domain/auth/security";
import { decryptSecret, encryptSecret } from "@/domain/connections/service";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const CREDENTIAL_KIND = "auth_credential";
export const RESET_KIND = "password_reset";
const RESET_TTL_MS = 60 * 60 * 1000;
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const GLOBAL_SCOPE = "global";

type Credential = {
  email: string;
  name: string;
  passwordHash: string;
  externalId: string;
  /** Two-step sign-in. The secret is encrypted at rest; recovery codes are stored as hashes. */
  mfa?: { secretCiphertext: string; enabledAt?: string; recoveryHashes: string[]; lastStep: number };
};
type ResetToken = { email: string; expiresAt: number; used: boolean };

export type AccountIdentity = { externalId: string; email: string; name: string };
export type AccountResult = { ok: true; identity: AccountIdentity; mfaRequired?: boolean } | { ok: false; error: string; message: string };

/**
 * First-party accounts: email plus a scrypt-hashed password, stored in the
 * document store. Provider-neutral, so a platform identity service (Govern)
 * can replace it without touching the rest of the app.
 */
export function createAccountService(repos: RepositorySet, clock: () => Date = () => new Date()) {
  const security = createSecurityService(repos, clock);
  const getCredential = async (email: string) => repos.documents.get<Credential>(CREDENTIAL_KIND, normalizeEmail(email));
  const saveCredential = async (doc: { id: string; workspaceId: string }, data: Credential) => repos.documents.put<Credential>({ kind: CREDENTIAL_KIND, id: doc.id, workspaceId: doc.workspaceId, data });
  const rateLimited = async (bucket: string, limit: number) => {
    const result = await repos.rateLimits.consume({ bucket, windowSeconds: 900, limit, now: new Date().toISOString() });
    return !result.allowed;
  };

  return {
    async signup(input: { name: string; email: string; password: string }, meta: RequestMeta = {}): Promise<AccountResult> {
      const email = normalizeEmail(input.email);
      const name = input.name.trim() || email.split("@")[0];
      if (!isPlausibleEmail(email)) return { ok: false, error: "invalid_email", message: "Enter a valid email address." };
      const weak = validatePasswordStrength(input.password, email);
      if (weak) return { ok: false, error: "weak_password", message: weak };
      if (!(await security.ipAllowed(meta))) return { ok: false, error: "rate_limited", message: "Too many attempts from this network. Try again in a few minutes." };
      if (await rateLimited(`signup:${email}`, 5)) return { ok: false, error: "rate_limited", message: "Too many attempts. Try again in a few minutes." };
      if (await repos.documents.get<Credential>(CREDENTIAL_KIND, email)) {
        return { ok: false, error: "email_taken", message: "An account with that email already exists. Log in instead." };
      }
      const externalId = `pw|${crypto.randomUUID()}`;
      await repos.documents.put<Credential>({
        kind: CREDENTIAL_KIND,
        id: email,
        workspaceId: GLOBAL_SCOPE,
        data: { email, name, passwordHash: hashPassword(input.password), externalId }
      });
      await repos.users.provision({ externalId, email, name });
      await security.record({ type: "signup", externalId, email, ...meta });
      return { ok: true, identity: { externalId, email, name } };
    },

    /**
     * Check an email and password. Locked accounts and busy networks are
     * refused before the password is checked; an unknown email costs the
     * same time as a wrong password, so neither reveals which accounts exist.
     * When the account has two-step sign-in, the result says so and no
     * session should start until `verifyMfa` passes.
     */
    async login(input: { email: string; password: string }, meta: RequestMeta = {}): Promise<AccountResult> {
      const email = normalizeEmail(input.email);
      if (!(await security.ipAllowed(meta))) return { ok: false, error: "rate_limited", message: "Too many attempts from this network. Try again in a few minutes." };
      const lock = await security.lockState(email);
      if (lock.locked) return { ok: false, error: "locked", message: `This account is locked after too many failed attempts. Try again after ${new Date(lock.until!).toUTCString().slice(17, 22)} UTC, or reset your password.` };
      const credential = await getCredential(email);
      const valid = verifyPassword(input.password, credential?.data.passwordHash ?? DECOY_HASH) && Boolean(credential);
      if (!valid || !credential) {
        const { lockedUntil } = await security.recordFailure(email, meta, credential?.data.externalId);
        return lockedUntil
          ? { ok: false, error: "locked", message: "Too many failed attempts. This account is locked for a while. Reset your password if you have forgotten it." }
          : { ok: false, error: "invalid_credentials", message: "That email and password don't match an account." };
      }
      await security.recordSuccess(email);
      const identity = { externalId: credential.data.externalId, email, name: credential.data.name };
      if (credential.data.mfa?.enabledAt) {
        await security.record({ type: "mfa.challenged", externalId: identity.externalId, email, ...meta });
        return { ok: true, identity, mfaRequired: true };
      }
      await security.record({ type: "login.succeeded", externalId: identity.externalId, email, ...meta, detail: { mfa: false } });
      return { ok: true, identity };
    },

    // --- two-step sign-in -------------------------------------------------

    async mfaEnabled(email: string): Promise<boolean> {
      return Boolean((await getCredential(email))?.data.mfa?.enabledAt);
    },

    /** Start setup: a new secret, kept pending until a code from the app confirms it. */
    async beginMfa(email: string): Promise<{ ok: true; secret: string; url: string } | { ok: false; message: string }> {
      const doc = await getCredential(email);
      if (!doc) return { ok: false, message: "Two-step sign-in in Pipes is for password accounts. Accounts that sign in through your identity provider use its two-step settings." };
      if (doc.data.mfa?.enabledAt) return { ok: false, message: "Two-step sign-in is already on. Turn it off first to set up a new app." };
      const secret = newSecret();
      await saveCredential(doc, { ...doc.data, mfa: { secretCiphertext: encryptSecret(secret), recoveryHashes: [], lastStep: -1 } });
      return { ok: true, secret, url: otpauthUrl(secret, doc.data.email) };
    },

    /** Finish setup with a code from the app. Returns the recovery codes, shown once. */
    async confirmMfa(email: string, code: string, meta: RequestMeta = {}): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; message: string }> {
      const doc = await getCredential(email);
      const pending = doc?.data.mfa;
      if (!doc || !pending || pending.enabledAt) return { ok: false, message: "Start setup again." };
      const step = verifyCode(decryptSecret(pending.secretCiphertext), code, clock().getTime(), pending.lastStep);
      if (step === null) return { ok: false, message: "That code is not right. Check the time on your phone and use the newest code." };
      const recoveryCodes = newRecoveryCodes();
      await saveCredential(doc, { ...doc.data, mfa: { ...pending, enabledAt: clock().toISOString(), lastStep: step, recoveryHashes: recoveryCodes.map(hashRecoveryCode) } });
      await security.record({ type: "mfa.enabled", externalId: doc.data.externalId, email: doc.data.email, ...meta });
      return { ok: true, recoveryCodes };
    },

    /**
     * Check a second factor at sign-in: a code from the app, or one of the
     * recovery codes (each works once). Failures count toward the lockout.
     */
    async verifyMfa(email: string, code: string, meta: RequestMeta = {}): Promise<AccountResult> {
      const key = normalizeEmail(email);
      const lock = await security.lockState(key);
      if (lock.locked) return { ok: false, error: "locked", message: "This account is locked after too many failed attempts. Try again later." };
      const doc = await getCredential(key);
      const mfa = doc?.data.mfa;
      if (!doc || !mfa?.enabledAt) return { ok: false, error: "invalid_code", message: "Sign in again." };
      const identity = { externalId: doc.data.externalId, email: doc.data.email, name: doc.data.name };
      const step = verifyCode(decryptSecret(mfa.secretCiphertext), code, clock().getTime(), mfa.lastStep);
      if (step !== null) {
        await saveCredential(doc, { ...doc.data, mfa: { ...mfa, lastStep: step } });
        await security.recordSuccess(key);
        await security.record({ type: "login.succeeded", externalId: identity.externalId, email: key, ...meta, detail: { mfa: true } });
        return { ok: true, identity };
      }
      const hash = hashRecoveryCode(code);
      if (mfa.recoveryHashes.includes(hash)) {
        const left = mfa.recoveryHashes.filter((h) => h !== hash);
        await saveCredential(doc, { ...doc.data, mfa: { ...mfa, recoveryHashes: left } });
        await security.recordSuccess(key);
        await security.record({ type: "mfa.recovery_used", externalId: identity.externalId, email: key, ...meta, detail: { left: left.length } });
        await security.record({ type: "login.succeeded", externalId: identity.externalId, email: key, ...meta, detail: { mfa: true, recovery: true } });
        return { ok: true, identity };
      }
      await security.record({ type: "mfa.failed", externalId: identity.externalId, email: key, ...meta });
      const { lockedUntil } = await security.recordFailure(key, meta, identity.externalId);
      return { ok: false, error: lockedUntil ? "locked" : "invalid_code", message: lockedUntil ? "Too many failed attempts. This account is locked for a while." : "That code is not right. Use the newest code from your app, or a recovery code." };
    },

    /** Turning it off needs the password and a current code, so a stolen session alone cannot. */
    async disableMfa(email: string, password: string, code: string, meta: RequestMeta = {}): Promise<{ ok: true } | { ok: false; message: string }> {
      const doc = await getCredential(email);
      const mfa = doc?.data.mfa;
      if (!doc || !mfa?.enabledAt) return { ok: false, message: "Two-step sign-in is not on." };
      if (!verifyPassword(password, doc.data.passwordHash)) return { ok: false, message: "Your password is not right." };
      const step = verifyCode(decryptSecret(mfa.secretCiphertext), code, clock().getTime(), mfa.lastStep);
      if (step === null && !mfa.recoveryHashes.includes(hashRecoveryCode(code))) return { ok: false, message: "That code is not right." };
      const { mfa: _gone, ...rest } = doc.data;
      await saveCredential(doc, rest);
      await security.record({ type: "mfa.disabled", externalId: doc.data.externalId, email: doc.data.email, ...meta });
      return { ok: true };
    },

    async recoveryCodesLeft(email: string): Promise<number> {
      return (await getCredential(email))?.data.mfa?.recoveryHashes.length ?? 0;
    },

    /** Whether this email signs in with a Pipes password (rather than an identity provider). */
    async hasPassword(email: string): Promise<boolean> {
      return Boolean(await repos.documents.get<Credential>(CREDENTIAL_KIND, normalizeEmail(email)));
    },

    async rename(identity: AccountIdentity, name: string): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
      const clean = name.trim().slice(0, 80);
      if (!clean) return { ok: false, message: "Enter your name." };
      await repos.users.rename(identity.externalId, clean);
      const credential = await repos.documents.get<Credential>(CREDENTIAL_KIND, normalizeEmail(identity.email));
      if (credential) await repos.documents.put<Credential>({ kind: CREDENTIAL_KIND, id: credential.id, workspaceId: credential.workspaceId, data: { ...credential.data, name: clean } });
      return { ok: true, name: clean };
    },

    async changePassword(email: string, current: string, next: string, meta: RequestMeta = {}): Promise<{ ok: true } | { ok: false; message: string }> {
      const key = normalizeEmail(email);
      if (await rateLimited(`password:${key}`, 10)) return { ok: false, message: "Too many attempts. Try again in a few minutes." };
      const credential = await repos.documents.get<Credential>(CREDENTIAL_KIND, key);
      if (!credential) return { ok: false, message: "This account signs in through an identity provider, so it has no Pipes password." };
      if (!verifyPassword(current, credential.data.passwordHash)) return { ok: false, message: "Your current password is not right." };
      const weak = validatePasswordStrength(next, key);
      if (weak) return { ok: false, message: weak };
      await repos.documents.put<Credential>({ kind: CREDENTIAL_KIND, id: credential.id, workspaceId: credential.workspaceId, data: { ...credential.data, passwordHash: hashPassword(next) } });
      await security.record({ type: "password.changed", externalId: credential.data.externalId, email: key, ...meta });
      return { ok: true };
    },

    /**
     * Start a reset. Always succeeds from the caller's point of view, so it never
     * reveals whether an email has an account. Returns the token only when one was issued.
     */
    async requestReset(email: string): Promise<{ token?: string; email: string; name?: string }> {
      const key = normalizeEmail(email);
      if (await rateLimited(`reset:${key}`, 5)) return { email: key };
      const credential = await repos.documents.get<Credential>(CREDENTIAL_KIND, key);
      if (!credential) return { email: key };
      const token = crypto.randomBytes(32).toString("base64url");
      await security.record({ type: "password.reset_requested", externalId: credential.data.externalId, email: key });
      await repos.documents.put<ResetToken>({ kind: RESET_KIND, id: sha256(token), workspaceId: GLOBAL_SCOPE, data: { email: key, expiresAt: Date.now() + RESET_TTL_MS, used: false } });
      return { token, email: key, name: credential.data.name };
    },

    async resetPassword(token: string, next: string): Promise<AccountResult> {
      const doc = await repos.documents.get<ResetToken>(RESET_KIND, sha256(token));
      if (!doc || doc.data.used || doc.data.expiresAt < Date.now()) return { ok: false, error: "invalid_token", message: "This reset link has expired or was already used. Ask for a new one." };
      const weak = validatePasswordStrength(next, doc.data.email);
      if (weak) return { ok: false, error: "weak_password", message: weak };
      const credential = await repos.documents.get<Credential>(CREDENTIAL_KIND, doc.data.email);
      if (!credential) return { ok: false, error: "invalid_token", message: "This reset link is not valid." };
      await repos.documents.put<ResetToken>({ kind: RESET_KIND, id: doc.id, workspaceId: doc.workspaceId, data: { ...doc.data, used: true } });
      await repos.documents.put<Credential>({ kind: CREDENTIAL_KIND, id: credential.id, workspaceId: credential.workspaceId, data: { ...credential.data, passwordHash: hashPassword(next) } });
      await security.record({ type: "password.reset", externalId: credential.data.externalId, email: credential.data.email });
      // A reset proves the email, not the second factor: an account with two-step sign-in still needs it.
      return { ok: true, identity: { externalId: credential.data.externalId, email: credential.data.email, name: credential.data.name }, mfaRequired: Boolean(credential.data.mfa?.enabledAt) };
    }
  };
}
