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
  const rawReturnUrl = searchParams.get("returnUrl") ?? "/settings/billing";

  if (!plan || !["Pro", "Builder"].includes(plan)) {
    return NextResponse.redirect(new URL("/settings/billing?status=cancel", request.url));
  }

  // Only allow relative paths to prevent open-redirect attacks.
  const safeReturnUrl =
    rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//")
      ? rawReturnUrl
      : "/settings/billing";

  try {
    const { ctx, repositories } = await getServerApp();
    await repositories.entitlements.upsertPlanState({
      workspaceId: ctx.workspaceId,
      plan,
      status: "active",
    });
    const destination = new URL(safeReturnUrl, request.url);
    destination.searchParams.set("upgrade", "success");
    destination.searchParams.set("plan", plan);
    return NextResponse.redirect(destination);
  } catch {
    return NextResponse.redirect(new URL("/settings/billing?status=error", request.url));
  }
}
