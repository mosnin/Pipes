import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    const tokens = await services.protocol.listTokens(ctx);
    return NextResponse.json(success(tokens));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    const created = await services.protocol.createToken(ctx, {
      name: body.name,
      capabilities: body.capabilities ?? [],
      systemId: body.systemId
    });
    return NextResponse.json(success({ ...created, authHeaderExample: `Authorization: Bearer ${created.secret}` }));
  } catch (error) {
    return apiError(error);
  }
}
