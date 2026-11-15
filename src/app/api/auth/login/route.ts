import { NextResponse } from "next/server";
import { beginOAuthLogin, resolveAuthMode } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const mode = resolveAuthMode();

  // Demo mode has no real sessions: every request is the demo owner.
  if (mode === "mock") return NextResponse.redirect(new URL(returnTo, request.url));

  if (mode === "unconfigured") {
    return NextResponse.json({ error: "auth_not_configured", message: "Sign-in is not configured on this deployment." }, { status: 503 });
  }

  return NextResponse.redirect(await beginOAuthLogin(returnTo));
}
