import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.apply) return NextResponse.json(success(await services.ai.applyEdits(ctx, body.systemId, body.suggestion, body.acceptedChangeIds)));
    return NextResponse.json(success(await services.ai.suggestEdits(ctx, body.systemId, body.prompt)));
  } catch (error) {
    return apiError(error);
  }
}
