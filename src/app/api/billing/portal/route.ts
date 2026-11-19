import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST() {
  try {
    const { ctx, services } = await getServerApp();
    const session = await services.billing.startPortal(ctx);
    return NextResponse.json(success(session));
  } catch (error) {
    return apiError(error);
  }
}
