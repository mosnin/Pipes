import crypto from "node:crypto";
import { hashPassword, isPlausibleEmail, normalizeEmail, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const CREDENTIAL_KIND = "auth_credential";
export const RESET_KIND = "password_reset";
const RESET_TTL_MS = 60 * 60 * 1000;
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const GLOBAL_SCOPE = "global";

type Credential = { email: string; name: string; passwordHash: string; externalId: string };
type ResetToken = { email: string; expiresAt: number; used: boolean };

export type AccountIdentity = { externalId: string; email: string; name: string };
export type AccountResult = { ok: true; identity: AccountIdentity } | { ok: false; error: string; message: string };

/**
 * First-party accounts: email plus a scrypt-hashed password, stored in the
 * document store. Provider-neutral, so a platform identity service (Govern)
 * can replace it without touching the rest of the app.
 */
export function createAccountService(repos: RepositorySet) {
  const rateLimited = async (bucket: string, limit: number) => {
    const result = await repos.rateLimits.consume({ bucket, windowSeconds: 900, limit, now: new Date().toISOString() });
    return !result.allowed;
  };

  return {
    async signup(input: { name: string; email: string; password: string }): Promise<AccountResult> {
      const email = normalizeEmail(input.email);
      const name = input.name.trim() || email.split("@")[0];
      if (!isPlausibleEmail(email)) return { ok: false, error: "invalid_email", message: "Enter a valid email address." };
      const weak = validatePasswordStrength(input.password);
      if (weak) return { ok: false, error: "weak_password", message: weak };
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
      return { ok: true, identity: { externalId, email, name } };
    },

    async login(input: { email: string; password: string }): Promise<AccountResult> {
      const email = normalizeEmail(input.email);
      if (await rateLimited(`login:${email}`, 10)) return { ok: false, error: "rate_limited", message: "Too many attempts. Try again in a few minutes." };
      const credential = await repos.documents.get<Credential>(CREDENTIAL_KIND, email);
      if (!credential || !verifyPassword(input.password, credential.data.passwordHash)) {
        return { ok: false, error: "invalid_credentials", message: "That email and password don't match an account." };
      }
      return { ok: true, identity: { externalId: credential.data.externalId, email, name: credential.data.name } };
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

    async changePassword(email: string, current: string, next: string): Promise<{ ok: true } | { ok: false; message: string }> {
      const key = normalizeEmail(email);
      if (await rateLimited(`password:${key}`, 10)) return { ok: false, message: "Too many attempts. Try again in a few minutes." };
      const credential = await repos.documents.get<Credential>(CREDENTIAL_KIND, key);
      if (!credential) return { ok: false, message: "This account signs in through an identity provider, so it has no Pipes password." };
      if (!verifyPassword(current, credential.data.passwordHash)) return { ok: false, message: "Your current password is not right." };
      const weak = validatePasswordStrength(next);
      if (weak) return { ok: false, message: weak };
      await repos.documents.put<Credential>({ kind: CREDENTIAL_KIND, id: credential.id, workspaceId: credential.workspaceId, data: { ...credential.data, passwordHash: hashPassword(next) } });
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
      await repos.documents.put<ResetToken>({ kind: RESET_KIND, id: sha256(token), workspaceId: GLOBAL_SCOPE, data: { email: key, expiresAt: Date.now() + RESET_TTL_MS, used: false } });
      return { token, email: key, name: credential.data.name };
    },

    async resetPassword(token: string, next: string): Promise<AccountResult> {
      const doc = await repos.documents.get<ResetToken>(RESET_KIND, sha256(token));
      if (!doc || doc.data.used || doc.data.expiresAt < Date.now()) return { ok: false, error: "invalid_token", message: "This reset link has expired or was already used. Ask for a new one." };
      const weak = validatePasswordStrength(next);
      if (weak) return { ok: false, error: "weak_password", message: weak };
      const credential = await repos.documents.get<Credential>(CREDENTIAL_KIND, doc.data.email);
      if (!credential) return { ok: false, error: "invalid_token", message: "This reset link is not valid." };
      await repos.documents.put<ResetToken>({ kind: RESET_KIND, id: doc.id, workspaceId: doc.workspaceId, data: { ...doc.data, used: true } });
      await repos.documents.put<Credential>({ kind: CREDENTIAL_KIND, id: credential.id, workspaceId: credential.workspaceId, data: { ...credential.data, passwordHash: hashPassword(next) } });
      return { ok: true, identity: { externalId: credential.data.externalId, email: credential.data.email, name: credential.data.name } };
    }
  };
}
