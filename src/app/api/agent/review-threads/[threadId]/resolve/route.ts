import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentCollaborationService } from "@/domain/services/agent_collaboration";
import { failure, success } from "@/lib/api/response";

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await params;
    const { ctx, repositories } = await getServerApp();
    const service = new AgentCollaborationService(repositories);
    await service.comments.resolveThread(ctx, { threadId });
    return NextResponse.json(success({ ok: true }));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
