import { NextResponse } from "next/server";
import { currentRequestMeta, readMfaChallenge, startSession } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth/session";
import { createAccountService } from "@/domain/services/accounts";
import { getRepositories } from "@/lib/composition/server";

/** The second step of sign-in: { code, returnTo? }. The code is from the authenticator app, or a recovery code. */
export async function POST(request: Request) {
  const challenge = await readMfaChallenge();
  if (!challenge) return NextResponse.json({ ok: false, error: "challenge_expired", message: "That took too long. Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { code?: string; returnTo?: string };
  const result = await createAccountService(getRepositories()).verifyMfa(challenge.email, String(body.code ?? ""), await currentRequestMeta());
  if (!result.ok) return NextResponse.json(result, { status: result.error === "locked" ? 423 : 401 });
  await startSession(result.identity, { mfa: true });
  return NextResponse.json({ ok: true, redirectTo: safeReturnTo(body.returnTo) });
}
