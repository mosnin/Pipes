import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    await services.signals.trackUnknown(ctx, String(body.event ?? ""), body.metadata ?? {});
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return apiError(error);
  }
}
