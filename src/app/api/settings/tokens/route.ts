import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

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
    const body = await request.json();
    const expiresInDays = body.expiresInDays != null ? Number(body.expiresInDays) : null;
    const created = await services.protocol.createToken(ctx, {
      name: body.name,
      capabilities: body.capabilities ?? [],
      systemId: body.systemId,
      expiresInDays: Number.isFinite(expiresInDays) && expiresInDays! > 0 ? expiresInDays : null
    });
    return NextResponse.json(success({ ...created, authHeaderExample: `Authorization: Bearer ${created.secret}` }));
  } catch (error) {
    const e = error as Error;
    return NextResponse.json(failure(e.message), { status: entitlementStatus(e) });
  }
}
