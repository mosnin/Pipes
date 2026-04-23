import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listStrategyPerformance(ctx, { runId: searchParams.get("runId") ?? undefined, systemId: searchParams.get("systemId") ?? undefined, strategyId: searchParams.get("strategyId") ?? undefined })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
