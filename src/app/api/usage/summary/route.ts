import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { USAGE_METERS, usageCost } from "@/lib/payments/meters";

export const runtime = "nodejs";

// Usage + payments summary for the workspace: per-meter unit totals and cost,
// plus the settled x402 payments. The read side of the metering infrastructure.
export async function GET() {
  const { ctx, repositories } = await getServerApp();

  const settlements = await repositories.payments.listSettlements(ctx.workspaceId).catch(() => []);

  const usage = await Promise.all(
    Object.values(USAGE_METERS).map(async (meter) => {
      const { units } = await repositories.payments
        .getUsageTotal({ workspaceId: ctx.workspaceId, meter: meter.id })
        .catch(() => ({ units: 0 }));
      return {
        meter: meter.id,
        label: meter.label,
        unitPriceUsd: meter.unitPriceUsd,
        units,
        costUsd: usageCost(meter.id, units),
      };
    }),
  );

  const totalSettledUsd = settlements.reduce((sum, s) => sum + (s.amountUsd ?? 0), 0);

  return NextResponse.json({ ok: true, data: { usage, settlements, totalSettledUsd } });
}
