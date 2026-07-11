import { NextResponse } from "next/server";
import { runtimeFlags } from "@/lib/env";

export async function GET(request: Request) {
  // Clerk owns its own session cookies. The canonical sign-out path is the
  // <SignOutButton/> client component (or the hosted /sign-out page Clerk
  // ships with @clerk/nextjs). For GET-style logout links (e.g. AppShell
  // navigation), redirect through Clerk's sign-out URL so the cookie is
  // cleared, then back to the marketing root.
  if (runtimeFlags.useMocks || !runtimeFlags.hasClerk) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(new URL("/sign-out", request.url));
}
