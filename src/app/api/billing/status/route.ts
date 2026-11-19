import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { success, failure } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success(await services.billing.getSummary(ctx)));
  } catch (error) {
    return apiError(error);
  }
}
