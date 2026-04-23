import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentCollaborationService } from "@/domain/services/agent_collaboration";
import { failure, success } from "@/lib/api/response";

export async function POST(request: Request, { params }: { params: Promise<{ handoffId: string }> }) {
  try {
    const { handoffId } = await params;
    const { ctx, repositories } = await getServerApp();
    const service = new AgentCollaborationService(repositories);
    await service.handoffs.accept(ctx, { handoffId });
    return NextResponse.json(success({ ok: true }));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
