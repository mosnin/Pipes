import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { safeFailure } from "@/lib/api/response";
import { getListing } from "@/lib/marketplace/catalog";
import { gateX402 } from "@/lib/payments/middleware";
import { settlementResponseHeader } from "@/lib/payments/x402";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { services, ctx, repositories } = await getServerApp();
  const { listingId, name } = (await req.json()) as { listingId: string; name: string };

  const listing = getListing(listingId);
  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  }

  // x402 gate. Free listings pass straight through; paid ones answer 402 with
  // payment requirements until a valid X-PAYMENT header settles.
  const gate = await gateX402(req, {
    resource: `marketplace:${listing.id}`,
    priceUsd: listing.price,
    description: `Install "${listing.title}" from the Pipes marketplace`,
  });
  if (!gate.ok) return gate.response;

  // Reserve the payment before provisioning so a retried X-PAYMENT can never
  // install (or charge for) the same loop twice.
  if (gate.amountUsd > 0) {
    const settle = await repositories.payments.recordSettlement({
      workspaceId: ctx.workspaceId,
      resourceId: `marketplace:${listing.id}`,
      amountUsd: gate.amountUsd,
      payer: gate.payer,
      scheme: gate.settlement.ok ? gate.settlement.settlement : "unknown",
      txHash: gate.settlement.ok ? gate.settlement.txHash : undefined,
      idempotencyKey: gate.paymentId ?? undefined,
    });
    if (settle.replayed) {
      return NextResponse.json({ ok: false, error: "This payment was already used to install a loop." }, { status: 409 });
    }
  }

  try {
    const { systemId } = await services.templates.instantiate(ctx, listing.templateId, `${name} (from marketplace)`);
    const res = NextResponse.json({ ok: true, data: { systemId } });
    const receipt = settlementResponseHeader(gate.settlement);
    if (gate.amountUsd > 0 && receipt) res.headers.set("x-payment-response", receipt);
    return res;
  } catch (err) {
    return NextResponse.json(safeFailure(err), { status: 400 });
  }
}
