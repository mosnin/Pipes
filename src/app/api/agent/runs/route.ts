import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const { ctx, repositories } = await getServerApp();
    const body = await request.json();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.createRun(ctx, { sessionId: body.sessionId, systemId: body.systemId, message: body.message })));
  } catch (error) {
    return apiError(error);
  }
}
