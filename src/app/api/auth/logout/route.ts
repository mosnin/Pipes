import { NextResponse } from "next/server";
import { clearSessionCookie, getAuthService } from "@/lib/auth";

export async function GET(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL(getAuthService().getLogoutUrl(), request.url));
}
