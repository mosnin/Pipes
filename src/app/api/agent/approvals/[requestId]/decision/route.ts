import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params;
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.reviewApproval(ctx, { requestId, decision: body.decision, note: body.note })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
