import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { getListing } from "@/lib/marketplace/catalog";
import { buildPaymentRequirements, paymentRequiredResponse, verifyPayment } from "@/lib/payments/x402";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { services, ctx } = await getServerApp();
  const { listingId, name } = (await req.json()) as { listingId: string; name: string };

  const listing = getListing(listingId);
  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  }

  // Paid listings require an x402 payment; free listings import directly.
  // No valid X-PAYMENT header -> answer 402 with the payment requirements an
  // agent or wallet needs to pay, then retry.
  if (listing.price > 0) {
    const requirements = buildPaymentRequirements({
      priceUsd: listing.price,
      resource: `marketplace:${listing.id}`,
      description: `Install "${listing.title}" from the Looper marketplace`,
    });
    const payment = await verifyPayment(req.headers.get("x-payment"), requirements);
    if (!payment.ok) {
      return paymentRequiredResponse(requirements, payment.error);
    }
  }

  try {
    // Instantiate the listing's starter template so the user gets a real loop.
    const systemId = await services.templates.instantiate(ctx, listing.templateId, `${name} (from marketplace)`);
    return NextResponse.json({ ok: true, data: { systemId } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
