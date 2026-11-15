import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { consumeOAuthState, resolveAuthMode, setSessionCookie } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth/session";

function loginError(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
}

export async function GET(request: Request) {
  if (resolveAuthMode() !== "auth0") return loginError(request, "auth_not_configured");

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const verified = await consumeOAuthState(requestUrl.searchParams.get("state"));
  if (!code || !verified) return loginError(request, "invalid_login_state");

  const tokenRes = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
    })
  });
  if (!tokenRes.ok) return loginError(request, "token_exchange_failed");
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) return loginError(request, "token_exchange_failed");

  const profileRes = await fetch(`https://${env.AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!profileRes.ok) return loginError(request, "profile_fetch_failed");
  const profile = (await profileRes.json()) as { sub?: string; email?: string; name?: string; nickname?: string };
  if (!profile.sub || !profile.email) return loginError(request, "profile_incomplete");

  await setSessionCookie({
    externalId: profile.sub,
    email: profile.email,
    name: profile.name ?? profile.nickname ?? profile.email
  });

  return NextResponse.redirect(new URL(safeReturnTo(verified.returnTo), request.url));
}
