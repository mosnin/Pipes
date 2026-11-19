import { NextResponse } from "next/server";
import { resolveAuthMode } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth/session";

/**
 * Old sign-in links keep working. Demo mode goes straight in; real sign-in
 * goes to the login page, which talks to Better Auth (docs/security.md).
 */
export function GET(request: Request) {
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"));
  if (resolveAuthMode() === "mock") return NextResponse.redirect(new URL(returnTo, request.url));
  return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));
}
