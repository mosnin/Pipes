import crypto from "node:crypto";
import { hashPassword, isPlausibleEmail, normalizeEmail, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const CREDENTIAL_KIND = "auth_credential";
const GLOBAL_SCOPE = "global";

type Credential = { email: string; name: string; passwordHash: string; externalId: string };

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
    }
  };
}
