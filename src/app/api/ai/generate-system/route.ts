import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.commit) return NextResponse.json(success(await services.ai.commitDraft(ctx, body.draft)));
    return NextResponse.json(success(await services.ai.generateDraft(ctx, body)));
  } catch (error) {
    return apiError(error);
  }
}
