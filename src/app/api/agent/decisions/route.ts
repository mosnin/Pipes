import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const systemId = url.searchParams.get("systemId") ?? undefined;
    const runId = url.searchParams.get("runId") ?? undefined;
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listDecisionRecords(ctx, { systemId, runId })));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.recordDecisionMemory(ctx, body)));
  } catch (error) {
    return apiError(error);
  }
}
