import { NextResponse } from "next/server";
import { endSession, getAuthService } from "@/lib/auth";

/** Sign out. The session is revoked on the server, so a copied cookie stops working too. */
export async function POST(request: Request) {
  await endSession();
  return NextResponse.json({ ok: true, redirectTo: new URL(getAuthService().getLogoutUrl(), request.url).toString() });
}

export async function GET(request: Request) {
  await endSession();
  return NextResponse.redirect(new URL(getAuthService().getLogoutUrl(), request.url));
}
