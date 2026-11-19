import { NextResponse } from "next/server";
import { createAccountService } from "@/domain/services/accounts";
import { createSecurityService } from "@/domain/auth/security";
import { currentRequestMeta, resolveAuthMode, setMfaChallenge, startSession } from "@/lib/auth";
import { getRepositories } from "@/lib/composition/server";

/**
 * Finish a reset: { token, password }. Every existing session for the account
 * ends, so whoever had the old password is signed out. The person is then
 * signed in, through the second step when their account has one.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const repos = getRepositories();
  const result = await createAccountService(repos).resetPassword(String(body.token ?? ""), String(body.password ?? ""));
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  await createSecurityService(repos).revokeAll(result.identity.externalId, "password_reset", undefined, await currentRequestMeta());
  if (resolveAuthMode() !== "password") return NextResponse.json({ ok: true, redirectTo: "/login" });
  if (result.mfaRequired) {
    await setMfaChallenge(result.identity);
    return NextResponse.json({ ok: true, redirectTo: "/login/two-step" });
  }
  await startSession(result.identity, { mfa: false });
  return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
}
