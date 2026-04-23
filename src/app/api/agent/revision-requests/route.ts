import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentCollaborationService } from "@/domain/services/agent_collaboration";
import { failure, success } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    const service = new AgentCollaborationService(repositories);
    return NextResponse.json(success(await service.negotiation.requestRevision(ctx, body)));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
