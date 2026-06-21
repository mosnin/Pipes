import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { runtimeFlags } from "@/lib/env";

export const runtime = "nodejs";

// Mock-mode-only: simulates a completed Paddle checkout by upgrading the
// workspace plan and redirecting back to the billing page with a success flag.
export async function GET(request: Request) {
  if (!runtimeFlags.useMocks) {
    return NextResponse.redirect(new URL("/settings/billing?status=cancel", request.url));
  }

  const { searchParams } = new URL(request.url);
  const plan = searchParams.get("plan") as "Pro" | "Builder" | null;
  const workspaceId = searchParams.get("workspaceId");
  const returnUrl = searchParams.get("returnUrl") ?? "/settings/billing";

  if (!plan || !workspaceId || !["Pro", "Builder"].includes(plan)) {
    return NextResponse.redirect(new URL("/settings/billing?status=cancel", request.url));
  }

  try {
    const { repositories } = await getServerApp();
    await repositories.entitlements.upsertPlanState({
      workspaceId,
      plan,
      status: "active",
    });
    const destination = new URL(returnUrl, request.url);
    destination.searchParams.set("upgrade", "success");
    destination.searchParams.set("plan", plan);
    return NextResponse.redirect(destination);
  } catch {
    return NextResponse.redirect(new URL("/settings/billing?status=error", request.url));
  }
}
