import { describe, expect, it } from "vitest";
import {
  buildPaymentRequirements,
  signDevVoucher,
  usdToAtomic,
  verifyPayment,
  X402_VERSION,
} from "@/lib/payments/x402";

describe("x402 payments", () => {
  it("converts USD to USDC atomic units (6 decimals)", () => {
    expect(usdToAtomic(19)).toBe("19000000");
    expect(usdToAtomic(0.5)).toBe("500000");
  });

  it("builds protocol-correct payment requirements", () => {
    const req = buildPaymentRequirements({
      priceUsd: 29,
      resource: "marketplace:sales-outreach-loop",
      description: "Install a loop",
    });
    expect(req.scheme).toBe("exact");
    expect(req.maxAmountRequired).toBe("29000000");
    expect(req.resource).toBe("marketplace:sales-outreach-loop");
    expect(req.mimeType).toBe("application/json");
    expect(X402_VERSION).toBe(1);
  });

  it("accepts a correctly signed dev voucher for the resource", async () => {
    const req = buildPaymentRequirements({ priceUsd: 19, resource: "marketplace:support", description: "x" });
    const voucher = signDevVoucher(req.resource, req.maxAmountRequired, "looper:ws_1");
    const result = await verifyPayment(voucher, req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payer).toBe("looper:ws_1");
      expect(result.settlement).toBe("dev_voucher");
    }
  });

  it("rejects a voucher minted for a different resource", async () => {
    const reqA = buildPaymentRequirements({ priceUsd: 19, resource: "marketplace:a", description: "x" });
    const reqB = buildPaymentRequirements({ priceUsd: 19, resource: "marketplace:b", description: "x" });
    const voucher = signDevVoucher(reqA.resource, reqA.maxAmountRequired, "looper:ws_1");
    const result = await verifyPayment(voucher, reqB);
    expect(result.ok).toBe(false);
  });

  it("rejects an underpaying voucher", async () => {
    const cheap = buildPaymentRequirements({ priceUsd: 5, resource: "marketplace:a", description: "x" });
    const expensive = buildPaymentRequirements({ priceUsd: 49, resource: "marketplace:a", description: "x" });
    const voucher = signDevVoucher(cheap.resource, cheap.maxAmountRequired, "looper:ws_1");
    const result = await verifyPayment(voucher, expensive);
    expect(result.ok).toBe(false);
  });

  it("rejects a missing payment header", async () => {
    const req = buildPaymentRequirements({ priceUsd: 19, resource: "marketplace:a", description: "x" });
    const result = await verifyPayment(null, req);
    expect(result.ok).toBe(false);
  });

  it("rejects a tampered voucher signature", async () => {
    const req = buildPaymentRequirements({ priceUsd: 19, resource: "marketplace:a", description: "x" });
    const voucher = signDevVoucher(req.resource, req.maxAmountRequired, "looper:ws_1");
    const decoded = JSON.parse(Buffer.from(voucher, "base64").toString("utf8"));
    decoded.payer = "looper:attacker";
    const tampered = Buffer.from(JSON.stringify(decoded)).toString("base64");
    const result = await verifyPayment(tampered, req);
    expect(result.ok).toBe(false);
  });
});
