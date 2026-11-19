import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { success, failure } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET(_: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listReconciliationRecords(ctx, runId)));
  } catch (error) {
    return apiError(error);
  }
}
