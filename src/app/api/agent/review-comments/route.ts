import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentCollaborationService } from "@/domain/services/agent_collaboration";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");
    if (!runId) throw new Error("runId_required");
    const { ctx, repositories } = await getServerApp();
    const service = new AgentCollaborationService(repositories);
    return NextResponse.json(success(await service.comments.list(ctx, { runId, targetType: searchParams.get("targetType") ?? undefined, targetId: searchParams.get("targetId") ?? undefined })));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    const service = new AgentCollaborationService(repositories);
    return NextResponse.json(success(await service.comments.addComment(ctx, body)));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
