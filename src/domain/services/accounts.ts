import type { RepositorySet } from "@/lib/repositories/contracts";

/**
 * Accounts from Pipes' first sign-in, before Better Auth: email, scrypt
 * password hash and an optional two-step secret, kept as documents. Read
 * only, by scripts/migrate-auth-to-better-auth.ts, which moves them into
 * Better Auth with their passwords and two-step secrets intact.
 */
export const CREDENTIAL_KIND = "auth_credential";

export type LegacyCredential = {
  email: string;
  name: string;
  passwordHash: string;
  externalId: string;
  mfa?: { secretCiphertext: string; enabledAt?: string; recoveryHashes: string[]; lastStep: number };
};

export async function listLegacyCredentials(repos: RepositorySet): Promise<LegacyCredential[]> {
  return (await repos.documents.list<LegacyCredential>(CREDENTIAL_KIND, {})).map((d) => d.data);
}
