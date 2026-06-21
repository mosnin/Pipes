import { describe, expect, it } from "vitest";
import { gateX402, gateMeteredX402 } from "@/lib/payments/middleware";
import { USAGE_METERS, usageCost, meterResourceId } from "@/lib/payments/meters";
import { buildPaymentRequirements, signDevVoucher } from "@/lib/payments/x402";

function reqWithPayment(payment?: string): Request {
  const headers: Record<string, string> = {};
  if (payment) headers["x-payment"] = payment;
  return new Request("http://localhost/api/usage/charge", { method: "POST", headers });
}

describe("usage meters", () => {
  it("prices units by the registered unit price", () => {
    expect(usageCost("agent_build", 3)).toBeCloseTo(USAGE_METERS.agent_build.unitPriceUsd * 3);
    expect(usageCost("protocol_call", 1000)).toBeCloseTo(USAGE_METERS.protocol_call.unitPriceUsd * 1000);
    expect(usageCost("unknown_meter", 5)).toBe(0);
  });

  it("builds canonical resource ids", () => {
    expect(meterResourceId("agent_build")).toBe("usage:agent_build");
  });
});

describe("gateX402", () => {
  it("passes free resources through with a synthetic payer", async () => {
    const gate = await gateX402(reqWithPayment(), { resource: "marketplace:free", priceUsd: 0, description: "x" });
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.payer).toBe("free");
      expect(gate.amountUsd).toBe(0);
    }
  });

  it("returns a 402 for a paid resource with no payment", async () => {
    const gate = await gateX402(reqWithPayment(), { resource: "marketplace:paid", priceUsd: 19, description: "x" });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(402);
  });

  it("settles a paid resource with a valid dev voucher", async () => {
    const resource = "marketplace:paid";
    const req = buildPaymentRequirements({ priceUsd: 19, resource, description: "x" });
    const voucher = signDevVoucher(req.resource, req.maxAmountRequired, "looper:ws_1");
    const gate = await gateX402(reqWithPayment(voucher), { resource, priceUsd: 19, description: "x" });
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.amountUsd).toBe(19);
      expect(gate.payer).toBe("looper:ws_1");
    }
  });
});

describe("gateMeteredX402", () => {
  it("prices a metered charge by units and gates on it", async () => {
    // 10 protocol calls -> a non-zero charge that requires payment.
    const noPay = await gateMeteredX402(reqWithPayment(), { meterId: "protocol_call", units: 10 });
    expect(noPay.ok).toBe(false);

    const resource = meterResourceId("protocol_call");
    const expectedUsd = usageCost("protocol_call", 10);
    const reqs = buildPaymentRequirements({ priceUsd: expectedUsd, resource, description: "x" });
    const voucher = signDevVoucher(reqs.resource, reqs.maxAmountRequired, "looper:ws_1");
    const paid = await gateMeteredX402(reqWithPayment(voucher), { meterId: "protocol_call", units: 10 });
    expect(paid.ok).toBe(true);
    if (paid.ok) expect(paid.amountUsd).toBeCloseTo(expectedUsd);
  });
});
