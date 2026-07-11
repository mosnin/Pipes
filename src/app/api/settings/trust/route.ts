import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";

const EnterpriseAuthSchema = z.object({
  mode: z.enum(["shared", "sso_ready"]),
  allowedDomains: z.array(z.string()),
  ssoConnection: z.string().optional(),
  enforceDomainMatch: z.boolean(),
});

const RetentionPolicySchema = z.object({
  archivedSystemRetentionDays: z.number().int().positive(),
  inviteExpiryDays: z.number().int().positive(),
  staleTokenDays: z.number().int().positive(),
  auditRetentionDays: z.number().int().positive(),
  signalRetentionDays: z.number().int().positive(),
});

const TrustPutSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("auth"), payload: EnterpriseAuthSchema }),
  z.object({ section: z.literal("retention"), payload: RetentionPolicySchema }),
]);

const TrustPostSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("deactivate"),
    reason: z.string().max(1000).optional(),
    confirmation: z.string().max(200).optional(),
  }),
  z.object({ action: z.literal("reactivate") }),
]);

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success(await services.governance.getTrustSettings(ctx)));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = TrustPutSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Unsupported section"), { status: 400 });
    }
    if (parsed.data.section === "auth") return NextResponse.json(success(await services.governance.updateEnterpriseAuth(ctx, parsed.data.payload)));
    return NextResponse.json(success(await services.governance.updateRetentionPolicy(ctx, parsed.data.payload)));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = TrustPostSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Unsupported action"), { status: 400 });
    }
    if (parsed.data.action === "deactivate") {
      return NextResponse.json(success(await services.governance.deactivateWorkspace(ctx, String(parsed.data.reason ?? ""), String(parsed.data.confirmation ?? ""))));
    }
    return NextResponse.json(success(await services.governance.reactivateWorkspace(ctx)));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
