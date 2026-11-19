import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET(_: Request, { params }: { params: Promise<{ runId: string; batchId: string }> }) {
  try {
    const { runId, batchId } = await params;
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listBatchDiffItems(ctx, { runId, batchId })));
  } catch (error) {
    return apiError(error);
  }
}
