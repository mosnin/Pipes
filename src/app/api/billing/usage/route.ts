import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export const runtime = "nodejs";

// Per-plan monthly build allowances. Free=50; paid plans are unlimited
// (matching the enforcement in /api/agent/build/route.ts).
const PLAN_LIMITS: Record<string, number> = {
  Free: 50,
  Pro: Number.POSITIVE_INFINITY,
  Builder: Number.POSITIVE_INFINITY,
  Enterprise: Number.POSITIVE_INFINITY,
};

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export async function GET() {
  try {
    const { ctx, repositories } = await getServerApp();
    const key = monthKey(new Date());
    const metric = await repositories.agentRunnerMetrics.getMonthly({
      userId: ctx.userId,
      monthKey: key,
    });
    const plan = ctx.plan;
    const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.Free;
    return NextResponse.json(
      success({
        used: metric?.buildsUsed ?? 0,
        limit,
        plan,
      }),
    );
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 401 });
  }
}
