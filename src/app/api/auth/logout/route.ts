import { NextResponse } from "next/server";
import { clearSessionCookie, getAuthService } from "@/lib/auth";
import { runtimeFlags } from "@/lib/env";

export async function GET(request: Request) {
  await clearSessionCookie();
  if (runtimeFlags.useMocks || !runtimeFlags.hasAuth0) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(getAuthService().getLogoutUrl());
}
