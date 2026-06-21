import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { gateMeteredX402 } from "@/lib/payments/middleware";
import { getMeter, meterResourceId } from "@/lib/payments/meters";

export const runtime = "nodejs";

// Usage-based x402: charge for N units of a metered resource. Answers 402 with
// payment requirements until settled, then records the usage and settlement.
// The reference endpoint for metering any priced action through x402.
export async function POST(req: Request) {
  const { ctx, repositories } = await getServerApp();
  const { meter, units = 1 } = (await req.json()) as { meter?: string; units?: number };

  if (!meter || !getMeter(meter)) {
    return NextResponse.json({ ok: false, error: "Unknown meter." }, { status: 400 });
  }
  const unitCount = Math.max(1, Math.floor(Number(units) || 1));

  const gate = await gateMeteredX402(req, { meterId: meter, units: unitCount });
  if (!gate.ok) return gate.response;

  const resourceId = meterResourceId(meter);
  await repositories.payments.recordUsage({ workspaceId: ctx.workspaceId, meter, units: unitCount, resourceId }).catch(() => undefined);
  if (gate.amountUsd > 0) {
    await repositories.payments
      .recordSettlement({
        workspaceId: ctx.workspaceId,
        resourceId,
        amountUsd: gate.amountUsd,
        payer: gate.payer,
        scheme: gate.settlement.ok ? gate.settlement.settlement : "unknown",
        txHash: gate.settlement.ok ? gate.settlement.txHash : undefined,
      })
      .catch(() => undefined);
  }

  return NextResponse.json({ ok: true, data: { meter, units: unitCount, amountUsd: gate.amountUsd } });
}
