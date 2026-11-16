import crypto from "node:crypto";
import { getEntitlements } from "@/domain/templates/plans";
import type { Plan } from "@/domain/pipes_schema_v1/schema";
import { env, runtimeFlags } from "@/lib/env";

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

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Billing isn't set up on this deployment yet. An operator needs to add the Creem keys.");
  }
}

export class WebhookRejectedError extends Error {}

export interface BillingService {
  readonly mode: "mock" | "creem" | "unconfigured";
  createCheckoutSession(input: { workspaceId: string; plan: Plan; email?: string; successUrl: string; cancelUrl: string }): Promise<{ checkoutUrl: string }>;
  createPortalSession(input: { workspaceId: string; customerId?: string; returnUrl: string }): Promise<{ portalUrl: string }>;
  parseWebhook(request: Request): Promise<PlanStateEvent | null>;
}

function withParams(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

/** Demo mode only: checkout succeeds immediately so the flow can be tried end to end. */
class MockBillingService implements BillingService {
  readonly mode = "mock" as const;
  async createCheckoutSession(input: { workspaceId: string; plan: Plan; successUrl: string }) {
    return { checkoutUrl: withParams(input.successUrl, { mockBilling: "success", plan: input.plan }) };
  }
  async createPortalSession(input: { returnUrl: string }) {
    return { portalUrl: withParams(input.returnUrl, { mockBilling: "portal" }) };
  }
  async parseWebhook(request: Request): Promise<PlanStateEvent | null> {
    const body = (await request.json().catch(() => null)) as any;
    if (!body?.workspaceId || !body?.plan) return null;
    return { workspaceId: body.workspaceId, plan: body.plan, status: body.status ?? "active" };
  }
}

/** Real mode without Creem keys: say so instead of pretending. */
class UnconfiguredBillingService implements BillingService {
  readonly mode = "unconfigured" as const;
  async createCheckoutSession(): Promise<{ checkoutUrl: string }> {
    throw new BillingNotConfiguredError();
  }
  async createPortalSession(): Promise<{ portalUrl: string }> {
    throw new BillingNotConfiguredError();
  }
  async parseWebhook(): Promise<PlanStateEvent | null> {
    throw new WebhookRejectedError("Billing webhooks are not accepted until CREEM_WEBHOOK_SECRET is set.");
  }
}

const PLAN_BY_EVENT_STATUS: Record<string, BillingStatus> = {
  "checkout.completed": "active",
  "subscription.active": "active",
  "subscription.paid": "active",
  "subscription.trialing": "trialing",
  "subscription.past_due": "past_due",
  "subscription.unpaid": "past_due",
  "subscription.canceled": "canceled",
  "subscription.expired": "canceled"
};

/**
 * Creem (https://docs.creem.io): API key in `x-api-key`, one product per paid
 * plan (CREEM_PRODUCT_PRO, CREEM_PRODUCT_BUILDER), the workspace carried in
 * checkout metadata, and webhooks signed with HMAC-SHA256 of the raw body in
 * the `creem-signature` header.
 */
class CreemBillingService implements BillingService {
  readonly mode = "creem" as const;
  private readonly base = process.env.CREEM_API_BASE || (env.CREEM_API_KEY?.startsWith("creem_test_") ? "https://test-api.creem.io/v1" : "https://api.creem.io/v1");

  private productFor(plan: Plan): string {
    const product = plan === "Pro" ? process.env.CREEM_PRODUCT_PRO : plan === "Builder" ? process.env.CREEM_PRODUCT_BUILDER : undefined;
    if (!product) throw new BillingNotConfiguredError();
    return product;
  }

  private planForProduct(productId?: string): Plan | undefined {
    if (productId && productId === process.env.CREEM_PRODUCT_PRO) return "Pro";
    if (productId && productId === process.env.CREEM_PRODUCT_BUILDER) return "Builder";
    return undefined;
  }

  private async call(path: string, body: unknown) {
    const response = await fetch(`${this.base}${path}`, {
      method: "POST",
      headers: { "x-api-key": String(env.CREEM_API_KEY), "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000)
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) throw new Error(`The billing provider refused the request (${response.status}). ${json.message ?? ""}`.trim());
    return json;
  }

  async createCheckoutSession(input: { workspaceId: string; plan: Plan; email?: string; successUrl: string }) {
    const json = await this.call("/checkouts", {
      product_id: this.productFor(input.plan),
      request_id: `${input.workspaceId}:${input.plan}:${Date.now()}`,
      success_url: input.successUrl,
      metadata: { workspaceId: input.workspaceId, plan: input.plan },
      ...(input.email ? { customer: { email: input.email } } : {})
    });
    const checkoutUrl = json.checkout_url ?? json.url;
    if (!checkoutUrl) throw new Error("The billing provider did not return a checkout link.");
    return { checkoutUrl };
  }

  async createPortalSession(input: { customerId?: string; returnUrl: string }) {
    if (!input.customerId) throw new Error("This workspace has no billing customer yet. Upgrade first.");
    const json = await this.call("/customers/billing", { customer_id: input.customerId });
    const portalUrl = json.customer_portal_link ?? json.url;
    if (!portalUrl) throw new Error("The billing provider did not return a portal link.");
    return { portalUrl };
  }

  async parseWebhook(request: Request): Promise<PlanStateEvent | null> {
    const secret = env.CREEM_WEBHOOK_SECRET;
    if (!secret) throw new WebhookRejectedError("CREEM_WEBHOOK_SECRET is not set.");
    const signature = request.headers.get("creem-signature") ?? "";
    const raw = await request.text();
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new WebhookRejectedError("Invalid webhook signature.");

    const event = JSON.parse(raw || "{}") as Record<string, any>;
    const status = PLAN_BY_EVENT_STATUS[String(event.eventType ?? event.type ?? "")];
    if (!status) return null;
    const object = event.object ?? event.data ?? {};
    const metadata = object.metadata ?? object.subscription?.metadata ?? {};
    const workspaceId = metadata.workspaceId;
    const productId = typeof object.product === "string" ? object.product : object.product?.id;
    const plan: Plan | undefined = status === "canceled" ? "Free" : (metadata.plan as Plan | undefined) ?? this.planForProduct(productId);
    if (!workspaceId || !plan) return null;
    const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
    const subscriptionId = typeof object.subscription === "string" ? object.subscription : object.subscription?.id ?? (String(event.eventType).startsWith("subscription.") ? object.id : undefined);
    return { workspaceId, plan, status, externalCustomerId: customerId, externalSubscriptionId: subscriptionId };
  }
}

export function billingConfigured(): boolean {
  return Boolean(env.CREEM_API_KEY && env.CREEM_WEBHOOK_SECRET && process.env.CREEM_PRODUCT_PRO && process.env.CREEM_PRODUCT_BUILDER);
}

export function getBillingService(): BillingService {
  if (runtimeFlags.useMocks) return new MockBillingService();
  if (!billingConfigured()) return new UnconfiguredBillingService();
  return new CreemBillingService();
}
