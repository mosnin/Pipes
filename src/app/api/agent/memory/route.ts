import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const systemId = url.searchParams.get("systemId") ?? undefined;
    const sessionId = url.searchParams.get("sessionId") ?? undefined;
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listMemoryEntries(ctx, { systemId, sessionId })));
  } catch (error) {
    return apiError(error);
  }
}
