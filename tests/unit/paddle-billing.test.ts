import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

const mockedEnv = vi.hoisted(() => ({
  env: {
    PADDLE_API_KEY: "pdl_test",
    PADDLE_WEBHOOK_SECRET: "whsec_test",
    PADDLE_ENVIRONMENT: "sandbox",
    PADDLE_PRICE_PRO: "pri_pro",
    PADDLE_PRICE_BUILDER: "pri_builder",
    NEXT_PUBLIC_APP_URL: "https://app.looper.dev",
  } as Record<string, string | undefined>,
  runtimeFlags: { useMocks: false, hasPaddle: true } as { useMocks: boolean; hasPaddle: boolean },
}));
vi.mock("@/lib/env", () => ({ env: mockedEnv.env, runtimeFlags: mockedEnv.runtimeFlags }));

import { PaddleBillingService } from "@/lib/billing";

function signPaddle(body: string, secret: string, ts: string): string {
  const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("PaddleBillingService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates a checkout transaction and returns the hosted checkout url", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ data: { checkout: { url: "https://sandbox-checkout.paddle.com/txn_1" } } }),
    }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const svc = new PaddleBillingService();
    const res = await svc.createCheckoutSession({
      workspaceId: "ws_1",
      plan: "Pro",
      successUrl: "https://app.looper.dev/settings/billing?status=success",
      cancelUrl: "https://app.looper.dev/settings/billing?status=cancel",
    });
    expect(res.checkoutUrl).toBe("https://sandbox-checkout.paddle.com/txn_1");

    // Hits the sandbox transactions endpoint with the mapped price id + bearer auth.
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://sandbox-api.paddle.com/transactions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer pdl_test");
    expect(init.body as string).toContain("pri_pro");
    expect(init.body as string).toContain("ws_1");
  });

  it("verifies a correctly signed webhook and maps it to a plan-state event", async () => {
    const body = JSON.stringify({
      event_type: "subscription.activated",
      data: { status: "active", customer_id: "ctm_1", id: "sub_1", custom_data: { workspaceId: "ws_1", plan: "Pro" } },
    });
    const sig = signPaddle(body, "whsec_test", "1700000000");
    const req = new Request("http://localhost/api/webhooks/paddle", {
      method: "POST",
      headers: { "paddle-signature": sig },
      body,
    });

    const svc = new PaddleBillingService();
    const event = await svc.parseWebhook(req);
    expect(event).toEqual({
      workspaceId: "ws_1",
      plan: "Pro",
      status: "active",
      externalCustomerId: "ctm_1",
      externalSubscriptionId: "sub_1",
    });
  });

  it("rejects a webhook with a bad signature", async () => {
    const body = JSON.stringify({ data: { status: "active", custom_data: { workspaceId: "ws_1", plan: "Pro" } } });
    const req = new Request("http://localhost/api/webhooks/paddle", {
      method: "POST",
      headers: { "paddle-signature": "ts=1700000000;h1=deadbeef" },
      body,
    });
    const svc = new PaddleBillingService();
    await expect(svc.parseWebhook(req)).rejects.toThrow();
  });

  it("maps paused/canceled paddle statuses to canceled", async () => {
    const body = JSON.stringify({ data: { status: "paused", customer_id: "ctm_2", id: "sub_2", custom_data: { workspaceId: "ws_2", plan: "Builder" } } });
    const sig = signPaddle(body, "whsec_test", "1700000001");
    const req = new Request("http://localhost/api/webhooks/paddle", { method: "POST", headers: { "paddle-signature": sig }, body });
    const event = await new PaddleBillingService().parseWebhook(req);
    expect(event?.status).toBe("canceled");
  });

  it("returns the billing return url when no customer id is known for the portal", async () => {
    const svc = new PaddleBillingService();
    const res = await svc.createPortalSession({ workspaceId: "ws_1", returnUrl: "https://app.looper.dev/settings/billing" });
    expect(res.portalUrl).toBe("https://app.looper.dev/settings/billing");
  });
});
