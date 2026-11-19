import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentCollaborationService } from "@/domain/services/agent_collaboration";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");
    if (!runId) throw new Error("runId_required");
    const { ctx, repositories } = await getServerApp();
    const service = new AgentCollaborationService(repositories);
    return NextResponse.json(success(await service.comments.list(ctx, { runId, targetType: searchParams.get("targetType") ?? undefined, targetId: searchParams.get("targetId") ?? undefined })));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    const service = new AgentCollaborationService(repositories);
    return NextResponse.json(success(await service.comments.addComment(ctx, body)));
  } catch (error) { return apiError(error); }
}
