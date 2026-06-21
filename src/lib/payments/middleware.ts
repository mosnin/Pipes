import { NextResponse } from "next/server";
import {
  buildPaymentRequirements,
  paymentId,
  paymentRequiredResponse,
  verifyPayment,
  type PaymentRequirements,
  type PaymentResult,
} from "@/lib/payments/x402";
import { getMeter, meterResourceId, usageCost } from "@/lib/payments/meters";

// ---------------------------------------------------------------------------
// x402 gate — the reusable way to put a price on any route.
//
// A route computes the resource + price, calls gateX402 (or gateMeteredX402),
// and either gets a settled payer or a ready-to-return 402 challenge. This is
// the generalization of the marketplace one-off into shared infrastructure for
// payments AND usage-based metering.
// ---------------------------------------------------------------------------

export type X402GateResult =
  | { ok: true; payer: string; settlement: PaymentResult; requirements: PaymentRequirements; amountUsd: number; paymentId: string | null }
  | { ok: false; response: NextResponse };

export type X402GateOptions = {
  resource: string; // canonical resource id, e.g. "marketplace:x" or "usage:agent_build"
  priceUsd: number;
  description: string;
};

// Free resources pass straight through with a synthetic payer.
export async function gateX402(req: Request, opts: X402GateOptions): Promise<X402GateResult> {
  if (opts.priceUsd <= 0) {
    return {
      ok: true,
      payer: "free",
      settlement: { ok: true, payer: "free", settlement: "dev_voucher" },
      requirements: buildPaymentRequirements({ priceUsd: 0, resource: opts.resource, description: opts.description }),
      amountUsd: 0,
      paymentId: null,
    };
  }
  const requirements = buildPaymentRequirements({
    priceUsd: opts.priceUsd,
    resource: opts.resource,
    description: opts.description,
  });
  const header = req.headers.get("x-payment");
  const settlement = await verifyPayment(header, requirements);
  if (!settlement.ok) {
    return { ok: false, response: paymentRequiredResponse(requirements, settlement.error) };
  }
  return { ok: true, payer: settlement.payer, settlement, requirements, amountUsd: opts.priceUsd, paymentId: header ? paymentId(header) : null };
}

// Usage-based variant: prices `units` of a registered meter and gates on it.
export async function gateMeteredX402(req: Request, input: { meterId: string; units: number }): Promise<X402GateResult> {
  const meter = getMeter(input.meterId);
  const priceUsd = usageCost(input.meterId, input.units);
  return gateX402(req, {
    resource: meterResourceId(input.meterId),
    priceUsd,
    description: meter
      ? `${input.units} x ${meter.label} (${meter.description})`
      : `Usage for ${input.meterId}`,
  });
}
