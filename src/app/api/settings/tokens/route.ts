import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";

const CapabilityEnum = z.enum(AGENT_CAPABILITIES);

const CreateTokenSchema = z.object({
  name: z.string().min(1).max(100),
  capabilities: z.array(CapabilityEnum).default([]),
  systemId: z.string().optional(),
  expiresInDays: z.number().int().positive().nullable().optional(),
});

function entitlementStatus(error: Error) {
  return (error.message ?? "").includes("requires Pro") ? 403 : 400;
}

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    const tokens = await services.protocol.listTokens(ctx);
    return NextResponse.json(success(tokens));
  } catch (error) {
    const e = error as Error;
    return NextResponse.json(failure(e.message), { status: entitlementStatus(e) });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = CreateTokenSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid token parameters"), { status: 422 });
    }
    const { name, capabilities, systemId, expiresInDays } = parsed.data;
    const created = await services.protocol.createToken(ctx, {
      name,
      capabilities,
      systemId,
      expiresInDays: expiresInDays ?? null,
    });
    return NextResponse.json(success({ ...created, authHeaderExample: `Authorization: Bearer ${created.secret}` }));
  } catch (error) {
    const e = error as Error;
    return NextResponse.json(failure(e.message), { status: entitlementStatus(e) });
  }
}
