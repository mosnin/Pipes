import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listSkillPerformance(ctx, { runId: searchParams.get("runId") ?? undefined, systemId: searchParams.get("systemId") ?? undefined, skillId: searchParams.get("skillId") ?? undefined })));
  } catch (error) {
    return apiError(error);
  }
}
