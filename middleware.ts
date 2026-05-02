import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/systems(.*)",
  "/settings(.*)",
  "/admin(.*)",
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
