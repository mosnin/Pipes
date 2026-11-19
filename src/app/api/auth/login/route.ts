import { NextResponse } from "next/server";
import { beginOAuthLogin, currentRequestMeta, resolveAuthMode, setMfaChallenge, startSession } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth/session";
import { createAccountService } from "@/domain/services/accounts";
import { getRepositories } from "@/lib/composition/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const mode = resolveAuthMode();

  // Demo mode has no real sessions: every request is the demo owner.
  if (mode === "mock") return NextResponse.redirect(new URL(returnTo, request.url));

  if (mode === "unconfigured") {
    return NextResponse.json({ error: "auth_not_configured", message: "Sign-in is not configured on this deployment." }, { status: 503 });
  }

  // Password accounts sign in on the form at /login.
  if (mode === "password") return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));

  return NextResponse.redirect(await beginOAuthLogin(returnTo));
}

const STATUS: Record<string, number> = { rate_limited: 429, locked: 423 };

/**
 * Email and password sign-in. Locked accounts get 423 and busy networks 429.
 * An account with two-step sign-in gets `mfaRequired` and a five-minute
 * challenge; no session starts until /api/auth/mfa accepts a code.
 */
export async function POST(request: Request) {
  if (resolveAuthMode() !== "password") {
    return NextResponse.json({ ok: false, error: "password_login_disabled", message: "Password sign-in is not enabled on this deployment." }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string; returnTo?: string };
  const result = await createAccountService(getRepositories()).login({ email: String(body.email ?? ""), password: String(body.password ?? "") }, await currentRequestMeta());
  if (!result.ok) return NextResponse.json(result, { status: STATUS[result.error] ?? 401 });
  const returnTo = safeReturnTo(body.returnTo);
  if (result.mfaRequired) {
    await setMfaChallenge(result.identity);
    return NextResponse.json({ ok: true, mfaRequired: true, redirectTo: `/login/two-step?returnTo=${encodeURIComponent(returnTo)}` });
  }
  await startSession(result.identity, { mfa: false });
  return NextResponse.json({ ok: true, redirectTo: returnTo });
}
