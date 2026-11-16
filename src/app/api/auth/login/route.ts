import { NextResponse } from "next/server";
import { beginOAuthLogin, resolveAuthMode, setSessionCookie } from "@/lib/auth";
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

/** Email + password sign-in. */
export async function POST(request: Request) {
  if (resolveAuthMode() !== "password") {
    return NextResponse.json({ ok: false, error: "password_login_disabled", message: "Password sign-in is not enabled on this deployment." }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string; returnTo?: string };
  const result = await createAccountService(getRepositories()).login({ email: String(body.email ?? ""), password: String(body.password ?? "") });
  if (!result.ok) return NextResponse.json(result, { status: result.error === "rate_limited" ? 429 : 401 });
  await setSessionCookie(result.identity);
  return NextResponse.json({ ok: true, redirectTo: safeReturnTo(body.returnTo) });
}
