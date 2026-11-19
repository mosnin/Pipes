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
    const [tasks, results] = await Promise.all([
      service.listSubAgentTasks(ctx, runId),
      service.listSubAgentResults(ctx, runId)
    ]);
    return NextResponse.json(success({ tasks, results }));
  } catch (error) {
    return apiError(error);
  }
}
