import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.mode === "existing" && body.preview) return NextResponse.json(success(await services.importExport.planMerge(ctx, body.schema, body.targetSystemId)));
    if (body.mode === "existing" && body.applyMerge) return NextResponse.json(success(await services.importExport.applyMerge(ctx, body.plan, body.strategy ?? "safe_upsert")));
    return NextResponse.json(success(await services.importExport.importSchema(ctx, body.schema, body.mode ?? "new", body.targetSystemId)));
  } catch (error) {
    return apiError(error);
  }
}
