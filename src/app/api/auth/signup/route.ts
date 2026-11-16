import { NextResponse } from "next/server";
import { resolveAuthMode, setSessionCookie } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth/session";
import { createAccountService } from "@/domain/services/accounts";
import { getRepositories } from "@/lib/composition/server";

/** Create a password account, its workspace, and a session. */
export async function POST(request: Request) {
  if (resolveAuthMode() !== "password") {
    return NextResponse.json({ ok: false, error: "password_signup_disabled", message: "Account creation with a password is not enabled on this deployment." }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { name?: string; email?: string; password?: string; returnTo?: string };
  const result = await createAccountService(getRepositories()).signup({
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? "")
  });
  if (!result.ok) return NextResponse.json(result, { status: result.error === "rate_limited" ? 429 : result.error === "email_taken" ? 409 : 400 });
  await setSessionCookie(result.identity);
  return NextResponse.json({ ok: true, redirectTo: safeReturnTo(body.returnTo, "/onboarding") });
}
