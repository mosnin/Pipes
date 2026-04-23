import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login", request.url));

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

  const token = await tokenRes.json();
  const profileRes = await fetch(`https://${env.AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  const profile = await profileRes.json();
  await setSessionCookie({
    externalId: profile.sub,
    email: profile.email,
    name: profile.name ?? profile.nickname ?? "Pipes User"
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
