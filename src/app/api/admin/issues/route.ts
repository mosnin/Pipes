import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import type { FeedbackCategory, FeedbackStatus } from "@/lib/repositories/contracts";

export async function GET(request: Request) {
  try {
    const { ctx, services, identity } = await getServerApp();
    services.access.ensureInternalOperator(identity.email);
    const url = new URL(request.url);
    const category = (url.searchParams.get("category") ?? undefined) as FeedbackCategory | undefined;
    const status = (url.searchParams.get("status") ?? undefined) as FeedbackStatus | undefined;
    const data = await services.triage.list(ctx, { category, status, limit: 120 });
    return NextResponse.json(success(data));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { ctx, services, identity } = await getServerApp();
    services.access.ensureInternalOperator(identity.email);
    const body = await request.json();
    await services.feedback.updateStatus(ctx, { id: String(body.id ?? ""), status: String(body.status ?? "") as FeedbackStatus });
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
