import { getEntitlements } from "@/domain/templates/plans";
import type { Plan } from "@/domain/looper_schema_v1/schema";
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

export type CheckoutInput = { workspaceId: string; plan: Plan; successUrl: string; cancelUrl: string };
export type PortalInput = { workspaceId: string; returnUrl: string; customerId?: string };

export interface BillingService {
  createCheckoutSession(input: CheckoutInput): Promise<{ checkoutUrl: string }>;
  createPortalSession(input: PortalInput): Promise<{ portalUrl: string }>;
  parseWebhook(request: Request): Promise<PlanStateEvent | null>;
}

class MockBillingService implements BillingService {
  async createCheckoutSession(input: CheckoutInput) {
    const base = env.NEXT_PUBLIC_APP_URL ?? "";
    const params = new URLSearchParams({ plan: String(input.plan), workspaceId: input.workspaceId, returnUrl: input.successUrl });
    return { checkoutUrl: `${base}/api/billing/mock-confirm?${params.toString()}` };
  }

  async createPortalSession(input: PortalInput) {
    return { portalUrl: `${input.returnUrl}?upgrade=portal` };
  }

  async parseWebhook(request: Request): Promise<PlanStateEvent | null> {
    const body = await request.json().catch(() => null) as any;
    if (!body?.workspaceId || !body?.plan) return null;
    return { workspaceId: body.workspaceId, plan: body.plan, status: body.status ?? "active" };
  }
}

// Maps a Paddle subscription status to our internal billing status.
function mapPaddleStatus(status: string | undefined): BillingStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "paused":
      return "canceled";
    default:
      return "active";
  }
}

export class PaddleBillingService implements BillingService {
  // Paddle Billing API. Sandbox unless PADDLE_ENVIRONMENT=production.
  private base = env.PADDLE_ENVIRONMENT === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

  private headers() {
    return { authorization: `Bearer ${env.PADDLE_API_KEY ?? ""}`, "content-type": "application/json" };
  }

  // Map a Looper plan to its Paddle price id (set per environment).
  private priceFor(plan: Plan): string | undefined {
    if (plan === "Pro") return env.PADDLE_PRICE_PRO;
    if (plan === "Builder" || plan === "Team") return env.PADDLE_PRICE_BUILDER;
    return undefined;
  }

  async createCheckoutSession(input: CheckoutInput) {
    const priceId = this.priceFor(input.plan);
    // Create a transaction; Paddle returns a hosted checkout URL on it.
    const response = await fetch(`${this.base}/transactions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        items: priceId ? [{ price_id: priceId, quantity: 1 }] : [],
        custom_data: { workspaceId: input.workspaceId, plan: input.plan },
        checkout: { url: input.successUrl },
      }),
    });
    const body = await response.json().catch(() => ({} as any));
    return { checkoutUrl: body?.data?.checkout?.url ?? input.successUrl };
  }

  async createPortalSession(input: PortalInput) {
    // Paddle portal sessions are keyed by customer id, captured from the
    // subscription webhook. Without one yet, fall back to the billing page.
    if (!input.customerId) return { portalUrl: input.returnUrl };
    const response = await fetch(`${this.base}/customers/${input.customerId}/portal-sessions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({}),
    });
    const body = await response.json().catch(() => ({} as any));
    return { portalUrl: body?.data?.urls?.general?.overview ?? input.returnUrl };
  }

  async parseWebhook(request: Request): Promise<PlanStateEvent | null> {
    const signatureHeader = request.headers.get("paddle-signature");
    const raw = await request.text();
    // Paddle signs as "ts=<unix>;h1=<hmac-sha256 of `${ts}:${rawBody}`>".
    // If a webhook secret is configured, the signature header is mandatory.
    if (env.PADDLE_WEBHOOK_SECRET) {
      if (!signatureHeader) throw new Error("Missing Paddle-Signature header.");
      const parts = Object.fromEntries(
        signatureHeader.split(";").map((p) => {
          const [k, v] = p.split("=");
          return [k?.trim(), v?.trim()];
        }),
      ) as { ts?: string; h1?: string };
      if (!parts.ts || !parts.h1) throw new Error("Malformed Paddle signature.");
      const computed = crypto.createHmac("sha256", env.PADDLE_WEBHOOK_SECRET).update(`${parts.ts}:${raw}`).digest("hex");
      const a = Buffer.from(computed);
      const b = Buffer.from(parts.h1);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("Invalid webhook signature.");
    }
    const payload = JSON.parse(raw || "{}");
    const data = payload?.data ?? {};
    const custom = data.custom_data ?? {};
    const workspaceId = custom.workspaceId;
    const plan = custom.plan as Plan | undefined;
    if (!workspaceId || !plan) return null;
    return {
      workspaceId,
      plan,
      status: mapPaddleStatus(data.status),
      externalCustomerId: data.customer_id,
      externalSubscriptionId: data.id ?? data.subscription_id,
    };
  }
}

export function getBillingService(): BillingService {
  if (runtimeFlags.useMocks || !runtimeFlags.hasPaddle) return new MockBillingService();
  return new PaddleBillingService();
}
