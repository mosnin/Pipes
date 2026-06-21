import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env, runtimeFlags } from "@/lib/env";

// ---------------------------------------------------------------------------
// x402 — HTTP 402 "Payment Required" for pay-per-use resources.
//
// Implements the x402 challenge/settle handshake: a protected resource answers
// 402 with the payment requirements an agent or wallet needs to pay, the client
// retries with an `X-PAYMENT` header, and the server verifies (and optionally
// settles through a facilitator) before serving the resource.
//
// Production settlement runs through a facilitator (X402_FACILITATOR_URL).
// Without one, a signed dev voucher path keeps the full flow exercisable end
// to end so the marketplace purchase works in mock mode.
// ---------------------------------------------------------------------------

export const X402_VERSION = 1;

export type PaymentRequirements = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string; // atomic units (USDC has 6 decimals)
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: { name: string; version: string };
};

export type X402Challenge = {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
};

export type PaymentResult =
  | { ok: true; payer: string; txHash?: string; settlement: "facilitator" | "dev_voucher" }
  | { ok: false; error: string };

const USDC_DECIMALS = 6;
const DEFAULT_NETWORK = "base-sepolia";
// USDC on Base Sepolia testnet.
const DEFAULT_ASSET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const DEFAULT_PAY_TO = "0x0000000000000000000000000000000000000000";

export function usdToAtomic(usd: number): string {
  return BigInt(Math.round(usd * 10 ** USDC_DECIMALS)).toString();
}

export function buildPaymentRequirements(input: {
  priceUsd: number;
  resource: string;
  description: string;
}): PaymentRequirements {
  return {
    scheme: "exact",
    network: env.X402_NETWORK ?? DEFAULT_NETWORK,
    maxAmountRequired: usdToAtomic(input.priceUsd),
    resource: input.resource,
    description: input.description,
    mimeType: "application/json",
    payTo: env.X402_PAY_TO_ADDRESS ?? DEFAULT_PAY_TO,
    maxTimeoutSeconds: 120,
    asset: env.X402_ASSET_ADDRESS ?? DEFAULT_ASSET,
    extra: { name: "USD Coin", version: "2" },
  };
}

export function paymentRequiredResponse(requirements: PaymentRequirements, message?: string): NextResponse {
  const body: X402Challenge = {
    x402Version: X402_VERSION,
    accepts: [requirements],
    error: message,
  };
  return NextResponse.json(body, { status: 402 });
}

// A dev voucher lets the full purchase flow run without a chain or facilitator.
// It is an HMAC over the resource + amount, keyed by the app's webhook secret
// (or a fixed dev key), so it cannot be forged across resources but requires no
// wallet. Replaced by real settlement the moment X402_FACILITATOR_URL is set.
function devVoucherKey(): string {
  return env.PADDLE_WEBHOOK_SECRET ?? env.X402_PAY_TO_ADDRESS ?? "looper-x402-dev";
}

export function signDevVoucher(resource: string, atomicAmount: string, payer: string): string {
  const mac = crypto
    .createHmac("sha256", devVoucherKey())
    .update(`${resource}:${atomicAmount}:${payer}`)
    .digest("hex");
  const payload = { scheme: "dev_voucher", payer, resource, amount: atomicAmount, mac };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function verifyDevVoucher(header: string, requirements: PaymentRequirements): PaymentResult {
  let payload: { scheme?: string; payer?: string; resource?: string; amount?: string; mac?: string };
  try {
    payload = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return { ok: false, error: "Malformed payment payload." };
  }
  if (payload.scheme !== "dev_voucher" || !payload.payer || !payload.resource || !payload.amount || !payload.mac) {
    return { ok: false, error: "Unsupported payment scheme." };
  }
  if (payload.resource !== requirements.resource) {
    return { ok: false, error: "Payment is for a different resource." };
  }
  if (BigInt(payload.amount) < BigInt(requirements.maxAmountRequired)) {
    return { ok: false, error: "Payment amount is insufficient." };
  }
  const expected = crypto
    .createHmac("sha256", devVoucherKey())
    .update(`${payload.resource}:${payload.amount}:${payload.payer}`)
    .digest("hex");
  // Constant-time compare.
  const a = Buffer.from(payload.mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Invalid payment signature." };
  }
  return { ok: true, payer: payload.payer, settlement: "dev_voucher" };
}

async function verifyThroughFacilitator(header: string, requirements: PaymentRequirements): Promise<PaymentResult> {
  const base = env.X402_FACILITATOR_URL;
  if (!base) return { ok: false, error: "No facilitator configured." };
  try {
    const verifyRes = await fetch(`${base}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader: header, paymentRequirements: requirements }),
    });
    const verify = await verifyRes.json();
    if (!verifyRes.ok || !verify?.isValid) {
      return { ok: false, error: verify?.invalidReason ?? "Payment verification failed." };
    }
    const settleRes = await fetch(`${base}/settle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader: header, paymentRequirements: requirements }),
    });
    const settle = await settleRes.json();
    if (!settleRes.ok || !settle?.success) {
      return { ok: false, error: settle?.error ?? "Payment settlement failed." };
    }
    return { ok: true, payer: settle.payer ?? verify.payer ?? "unknown", txHash: settle.txHash, settlement: "facilitator" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Verify an inbound X-PAYMENT header against the requirements for a resource.
 * Uses the facilitator when configured; otherwise accepts a signed dev voucher.
 */
export async function verifyPayment(header: string | null, requirements: PaymentRequirements): Promise<PaymentResult> {
  if (!header) return { ok: false, error: "Missing X-PAYMENT header." };
  if (runtimeFlags.hasX402Facilitator) {
    return verifyThroughFacilitator(header, requirements);
  }
  return verifyDevVoucher(header, requirements);
}
