import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { HandoffReviewService } from "@/domain/services/handoff_review";

export async function POST(request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  try {
    const body = await request.json();
    const { packageId } = await params;
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new HandoffReviewService(repositories).review(ctx, { packageId, decision: body.decision, note: body.note })));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
