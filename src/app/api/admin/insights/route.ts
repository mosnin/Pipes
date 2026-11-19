import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const { ctx, services, identity } = await getServerApp();
    services.access.ensureInternalOperator(identity.email);
    const url = new URL(request.url);
    const since = url.searchParams.get("since") ?? undefined;
    const summary = await services.insights.summary(ctx, { since });
    return NextResponse.json(success(summary));
  } catch (error) {
    return apiError(error, 403);
  }
}
