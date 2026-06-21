import { afterEach, describe, expect, it, vi } from "vitest";

const mockedServer = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mockedServer }));
vi.mock("@/lib/env", () => ({
  env: { PADDLE_WEBHOOK_SECRET: "whsec_test", X402_NETWORK: "base-sepolia" } as Record<string, string | undefined>,
  runtimeFlags: { hasX402Facilitator: false } as { hasX402Facilitator: boolean },
}));

import { buildPaymentRequirements, signDevVoucher } from "@/lib/payments/x402";
import { meterResourceId, usageCost } from "@/lib/payments/meters";

type UsageCall = { workspaceId: string; meter: string; units: number; resourceId: string };
type SettleCall = { resourceId: string; amountUsd: number; payer: string };

function buildApp() {
  const usage: UsageCall[] = [];
  const settlements: Array<SettleCall & { idempotencyKey?: string }> = [];
  const seenKeys = new Set<string>();
  const repositories = {
    payments: {
      recordUsage: vi.fn(async (i: UsageCall) => { usage.push(i); }),
      recordSettlement: vi.fn(async (i: SettleCall & { idempotencyKey?: string }) => {
        if (i.idempotencyKey && seenKeys.has(i.idempotencyKey)) return { id: "pay_existing", replayed: true };
        if (i.idempotencyKey) seenKeys.add(i.idempotencyKey);
        settlements.push(i);
        return { id: `pay_${settlements.length}`, replayed: false };
      }),
    },
  };
  mockedServer.mockResolvedValue({ ctx: { workspaceId: "ws_1" }, repositories });
  return { usage, settlements };
}

async function charge(body: unknown, payment?: string) {
  const { POST } = await import("@/app/api/usage/charge/route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (payment) headers["x-payment"] = payment;
  return POST(new Request("http://localhost/api/usage/charge", { method: "POST", headers, body: JSON.stringify(body) }));
}

describe("POST /api/usage/charge", () => {
  afterEach(() => vi.clearAllMocks());

  it("answers 402 for a metered charge with no payment", async () => {
    buildApp();
    const res = await charge({ meter: "protocol_call", units: 10 });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts[0].resource).toBe("usage:protocol_call");
  });

  it("settles with a dev voucher, records usage + settlement, returns a receipt header", async () => {
    const { usage, settlements } = buildApp();
    const amount = usageCost("protocol_call", 10);
    const reqs = buildPaymentRequirements({ priceUsd: amount, resource: meterResourceId("protocol_call"), description: "x" });
    const voucher = signDevVoucher(reqs.resource, reqs.maxAmountRequired, "looper:ws_1");

    const res = await charge({ meter: "protocol_call", units: 10 }, voucher);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.amountUsd).toBeCloseTo(amount);

    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ meter: "protocol_call", units: 10, workspaceId: "ws_1" });
    expect(settlements).toHaveLength(1);
    expect(settlements[0].amountUsd).toBeCloseTo(amount);
    expect(res.headers.get("x-payment-response")).toBeTruthy();
  });

  it("is idempotent: a replayed payment does not double-meter or double-settle", async () => {
    const { usage, settlements } = buildApp();
    const amount = usageCost("protocol_call", 10);
    const reqs = buildPaymentRequirements({ priceUsd: amount, resource: meterResourceId("protocol_call"), description: "x" });
    const voucher = signDevVoucher(reqs.resource, reqs.maxAmountRequired, "looper:ws_1");

    const first = await charge({ meter: "protocol_call", units: 10 }, voucher);
    expect((await first.json()).data.replayed).toBe(false);
    const second = await charge({ meter: "protocol_call", units: 10 }, voucher);
    expect((await second.json()).data.replayed).toBe(true);

    // Same payment -> usage and settlement recorded exactly once.
    expect(usage).toHaveLength(1);
    expect(settlements).toHaveLength(1);
  });

  it("rejects an unknown meter", async () => {
    buildApp();
    const res = await charge({ meter: "nope", units: 1 });
    expect(res.status).toBe(400);
  });
});
