import { NextResponse } from "next/server";
import { createAccountService } from "@/domain/services/accounts";
import { resolveAuthMode, setSessionCookie } from "@/lib/auth";
import { getRepositories } from "@/lib/composition/server";

/** Finish a reset: { token, password }. Signs you in on success. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await createAccountService(getRepositories()).resetPassword(String(body.token ?? ""), String(body.password ?? ""));
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  if (resolveAuthMode() === "password") await setSessionCookie(result.identity);
  return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
}
