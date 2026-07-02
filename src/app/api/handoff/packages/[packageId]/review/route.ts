import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";
import { HandoffReviewService } from "@/domain/services/handoff_review";

const ReviewSchema = z.object({
  decision: z.enum(["approved", "rejected", "revision_requested"]),
  note: z.string().max(2000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  try {
    const raw = await request.json();
    const parsed = ReviewSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid review decision"), { status: 422 });
    }
    const { packageId } = await params;
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new HandoffReviewService(repositories).review(ctx, { packageId, ...parsed.data })));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
