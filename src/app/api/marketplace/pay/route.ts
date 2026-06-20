import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { runtimeFlags } from "@/lib/env";
import { getListing } from "@/lib/marketplace/catalog";
import { buildPaymentRequirements, signDevVoucher } from "@/lib/payments/x402";

export const runtime = "nodejs";

// Mints an x402 payment the app's own UI can use to complete a marketplace
// purchase in dev mode. When a real facilitator is configured, payment must be
// constructed by the caller's wallet against the 402 challenge instead, so this
// endpoint declines.
export async function POST(req: Request) {
  const { ctx } = await getServerApp();
  const { listingId } = (await req.json()) as { listingId: string };

  const listing = getListing(listingId);
  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  }
  if (listing.price <= 0) {
    return NextResponse.json({ ok: false, error: "This loop is free." }, { status: 400 });
  }
  if (runtimeFlags.hasX402Facilitator) {
    return NextResponse.json(
      { ok: false, error: "Pay through your wallet using the 402 challenge.", requiresWallet: true },
      { status: 409 },
    );
  }

  const requirements = buildPaymentRequirements({
    priceUsd: listing.price,
    resource: `marketplace:${listing.id}`,
    description: `Install "${listing.title}" from the Looper marketplace`,
  });
  const payer = `looper:${ctx.workspaceId}`;
  const payment = signDevVoucher(requirements.resource, requirements.maxAmountRequired, payer);
  return NextResponse.json({ ok: true, data: { payment, amountUsd: listing.price } });
}
