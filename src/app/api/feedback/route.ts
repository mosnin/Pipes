import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import type { FeedbackCategory, FeedbackSeverity } from "@/lib/repositories/contracts";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const { ctx, services, identity } = await getServerApp();
    const body = await request.json();
    const created = await services.feedback.create(ctx, {
      category: body.category as FeedbackCategory,
      severity: body.severity as FeedbackSeverity,
      summary: String(body.summary ?? ""),
      details: String(body.details ?? ""),
      page: String(body.page ?? ""),
      systemId: body.systemId ? String(body.systemId) : undefined,
      userEmail: identity.email
    });
    return NextResponse.json(success(created));
  } catch (error) {
    return apiError(error);
  }
}
