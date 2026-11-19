/**
 * One-off: move accounts from Pipes' first sign-in into Better Auth, with
 * their passwords, two-step secrets and recovery codes (docs/security.md,
 * "Moving to Better Auth"). Run with the production environment loaded:
 *
 *   npx tsx scripts/migrate-auth-to-better-auth.mts
 *
 * Safe to run twice. People are signed out once and sign in as before.
 */
import { getAuth } from "../src/lib/auth/server";
import { migrateLegacyAccounts } from "../src/lib/auth/migrate";
import { getRepositories } from "../src/lib/composition/repositories";

const result = await migrateLegacyAccounts(await getAuth(), getRepositories());
console.log(`Moved ${result.created} accounts (${result.withTwoStep} with two-step sign-in); ${result.skipped} were already there.`);
