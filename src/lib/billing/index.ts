import { getEntitlements } from "@/domain/templates/plans";
import type { Plan } from "@/domain/pipes_schema_v1/schema";
import { env, runtimeFlags } from "@/lib/env";
import crypto from "node:crypto";

export type BillingStatus = "active" | "canceled" | "past_due" | "trialing";

export type BillingSummary = {
  plan: Plan;
  status: BillingStatus;
  entitlements: ReturnType<typeof getEntitlements>;
};

export type PlanStateEvent = {
  workspaceId: string;
  plan: Plan;
  status: BillingStatus;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
};

export interface BillingService {
  createCheckoutSession(input: { workspaceId: string; plan: Plan; successUrl: string; cancelUrl: string }): Promise<{ checkoutUrl: string }>;
  createPortalSession(input: { workspaceId: string; returnUrl: string }): Promise<{ portalUrl: string }>;
  parseWebhook(request: Request): Promise<PlanStateEvent | null>;
}

class MockBillingService implements BillingService {
  async createCheckoutSession(input: { workspaceId: string; plan: Plan; successUrl: string }) {
    return { checkoutUrl: `${input.successUrl}?mockBilling=success&plan=${input.plan}&workspaceId=${input.workspaceId}` };
  }

  async createPortalSession(input: { returnUrl: string }) {
    return { portalUrl: `${input.returnUrl}?mockBilling=portal` };
  }

  async parseWebhook(request: Request): Promise<PlanStateEvent | null> {
    const body = await request.json().catch(() => null) as any;
    if (!body?.workspaceId || !body?.plan) return null;
    return { workspaceId: body.workspaceId, plan: body.plan, status: body.status ?? "active" };
  }
}

class CreemBillingService implements BillingService {
  private base = "https://api.creem.io/v1";

  async createCheckoutSession(input: { workspaceId: string; plan: Plan; successUrl: string; cancelUrl: string }) {
    const response = await fetch(`${this.base}/checkout/sessions`, {
      method: "POST",
      headers: { "authorization": `Bearer ${env.CREEM_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: input.workspaceId, plan: input.plan, successUrl: input.successUrl, cancelUrl: input.cancelUrl })
    });
    const body = await response.json();
    return { checkoutUrl: body.url ?? input.successUrl };
  }

  async createPortalSession(input: { workspaceId: string; returnUrl: string }) {
    const response = await fetch(`${this.base}/billing/portal-sessions`, {
      method: "POST",
      headers: { "authorization": `Bearer ${env.CREEM_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: input.workspaceId, returnUrl: input.returnUrl })
    });
    const body = await response.json();
    return { portalUrl: body.url ?? input.returnUrl };
  }

  async parseWebhook(request: Request): Promise<PlanStateEvent | null> {
    const signature = request.headers.get("creem-signature");
    const raw = await request.text();
    if (env.CREEM_WEBHOOK_SECRET && signature) {
      const computed = crypto.createHmac("sha256", env.CREEM_WEBHOOK_SECRET).update(raw).digest("hex");
      if (computed !== signature) throw new Error("Invalid webhook signature.");
    }
    const payload = JSON.parse(raw || "{}");
    if (!payload?.workspaceId || !payload?.plan) return null;
    return {
      workspaceId: payload.workspaceId,
      plan: payload.plan,
      status: payload.status ?? "active",
      externalCustomerId: payload.customerId,
      externalSubscriptionId: payload.subscriptionId
    };
  }
}

export function getBillingService(): BillingService {
  if (runtimeFlags.useMocks || !runtimeFlags.hasCreem) return new MockBillingService();
  return new CreemBillingService();
}
