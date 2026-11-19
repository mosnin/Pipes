import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin check for state-changing API requests made with a session
 * cookie (docs/security.md). Session cookies are SameSite=Lax already; this
 * is the second lock: a browser always sends Origin on a cross-site POST, so
 * a request carrying our cookie from another site is refused before it runs.
 * Requests that authenticate with a bearer token (MCP, API tokens), and
 * signed webhooks, carry no session cookie and pass through.
 */
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/** Tells server code this is an API call, so auth and policy refusals answer 401 or 403 instead of redirecting. */
function next(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pipes-surface", "api");
  return NextResponse.next({ request: { headers } });
}

export function proxy(request: NextRequest) {
  if (SAFE.has(request.method)) return next(request);
  // Better Auth's cookies: pipes.session_token and, mid-sign-in, pipes.two_factor (with a __Secure- prefix in production).
  const hasSession = request.cookies.getAll().some((c) => c.name.endsWith("pipes.session_token") || c.name.endsWith("pipes.two_factor"));
  if (!hasSession || request.headers.get("authorization")) return next(request);
  const origin = request.headers.get("origin");
  if (!origin) return next(request);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (originHost && host && originHost === host) return next(request);
  return NextResponse.json({ ok: false, error: "cross_site_request", message: "This request came from another site, so Pipes refused it." }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
