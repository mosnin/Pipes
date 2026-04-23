import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";

export async function POST(request: Request, { params }: { params: Promise<{ runId: string; batchId: string }> }) {
  try {
    const { runId, batchId } = await params;
    const body = await request.json().catch(() => ({}));
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.getAffectedRegion(ctx, { runId, batchId, selectedProposalIds: body.selectedProposalIds ?? [] })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
