import { symmetricEncrypt } from "better-auth/crypto";
import { decryptSecret } from "@/domain/connections/service";
import { listLegacyCredentials } from "@/domain/services/accounts";
import type { RepositorySet } from "@/lib/repositories/contracts";

type Auth = { $context: Promise<any> };

/**
 * Moves accounts from Pipes' first sign-in into Better Auth, keeping what
 * people already use: their password (the scrypt hash is stored as is and
 * checked by the legacy verifier), their two-step secret (re-encrypted under
 * Better Auth's key as `base32:<secret>`), and their recovery codes (already
 * hashes, which is how Pipes stores them in Better Auth too). Their Pipes
 * user and workspaces carry over through the same externalId.
 *
 * Safe to run more than once: accounts that already exist are skipped.
 */
export async function migrateLegacyAccounts(auth: Auth, repos: RepositorySet): Promise<{ created: number; skipped: number; withTwoStep: number }> {
  const ctx = await auth.$context;
  let created = 0;
  let skipped = 0;
  let withTwoStep = 0;
  for (const c of await listLegacyCredentials(repos)) {
    if (await ctx.internalAdapter.findUserByEmail(c.email)) {
      skipped++;
      continue;
    }
    const user = await ctx.internalAdapter.createUser({ email: c.email, name: c.name, emailVerified: false, externalId: c.externalId }, { method: "email" });
    await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: c.passwordHash });
    if (c.mfa?.enabledAt) {
      const secret = decryptSecret(c.mfa.secretCiphertext).replace(/\s+/g, "");
      await ctx.adapter.create({
        model: "twoFactor",
        data: { userId: user.id, verified: true, secret: await symmetricEncrypt({ key: ctx.secretConfig, data: `base32:${secret}` }), backupCodes: JSON.stringify(c.mfa.recoveryHashes) }
      });
      await ctx.internalAdapter.updateUser(user.id, { twoFactorEnabled: true });
      withTwoStep++;
    }
    created++;
  }
  return { created, skipped, withTwoStep };
}
