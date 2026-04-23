import { NextResponse } from "next/server";
import { getAuthService, setSessionCookie } from "@/lib/auth";
import { runtimeFlags } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/dashboard";

  if (runtimeFlags.useMocks || !runtimeFlags.hasAuth0) {
    await setSessionCookie({ externalId: "mock|usr_1", email: "owner@pipes.local", name: "Alex Rivera" });
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const auth = getAuthService();
  return NextResponse.redirect(auth.getLoginUrl(returnTo));
}
