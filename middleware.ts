import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public, unauthenticated routes (kept here as documentation, not enforced):
// - `/` and any other marketing route
// - `/play` — the guest playground: a visitor lands, picks a starter, and
//   watches the canvas build itself in seconds. No Clerk, no Convex.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/systems(.*)",
  "/settings(.*)",
  "/admin(.*)",
  "/welcome(.*)",
  "/api/library(.*)",
  "/api/systems(.*)",
  "/api/agent(.*)",
  "/api/graph(.*)",
  "/api/governance(.*)"
]);

const isMockMode = process.env.PIPES_USE_MOCKS === "true";
const hasClerk = Boolean(
  process.env.CLERK_SECRET_KEY &&
    (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY)
);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export default function middleware(req: NextRequest, event: Parameters<typeof clerkHandler>[1]) {
  if (isMockMode || !hasClerk) return NextResponse.next();
  return clerkHandler(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
