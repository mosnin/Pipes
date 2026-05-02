import { NextResponse } from "next/server";
import { runtimeFlags } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/dashboard";

  // In mock mode (or when Clerk is not configured), there is nothing to sign
  // into. Send the user straight to the destination so the dev workflow works
  // without external services.
  if (runtimeFlags.useMocks || !runtimeFlags.hasClerk) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  // Real auth: hand off to Clerk's hosted sign-in.
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("redirect_url", returnTo);
  return NextResponse.redirect(signIn);
}
