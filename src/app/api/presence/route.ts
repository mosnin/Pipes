import { NextResponse } from "next/server";
import { success, failure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";
import { apiError } from "@/lib/api/errors";

type PresenceResponse = { ok: boolean; data?: unknown; error?: string };

export async function GET(request: Request): Promise<NextResponse<PresenceResponse>> {
  try {
    const url = new URL(request.url);
    const systemId = url.searchParams.get("systemId") ?? "";
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success(await services.presence.list(ctx, systemId)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse<PresenceResponse>> {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    await services.presence.upsert(ctx, body);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return apiError(error);
  }
}
