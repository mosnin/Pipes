import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { getListing } from "@/lib/marketplace/catalog";
import { gateX402 } from "@/lib/payments/middleware";

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
    description: `Install "${listing.title}" from the Looper marketplace`,
  });
  if (!gate.ok) return gate.response;

  try {
    const systemId = await services.templates.instantiate(ctx, listing.templateId, `${name} (from marketplace)`);
    // Record the settled purchase (skip free installs).
    if (gate.amountUsd > 0) {
      await repositories.payments
        .recordSettlement({
          workspaceId: ctx.workspaceId,
          resourceId: `marketplace:${listing.id}`,
          amountUsd: gate.amountUsd,
          payer: gate.payer,
          scheme: gate.settlement.ok ? gate.settlement.settlement : "unknown",
          txHash: gate.settlement.ok ? gate.settlement.txHash : undefined,
        })
        .catch(() => undefined);
    }
    return NextResponse.json({ ok: true, data: { systemId } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
