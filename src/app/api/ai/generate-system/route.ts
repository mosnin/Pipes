import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.commit) return NextResponse.json(success(await services.ai.commitDraft(ctx, body.draft)));
    return NextResponse.json(success(await services.ai.generateDraft(ctx, body)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
