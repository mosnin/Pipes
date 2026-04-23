import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const resolved = await params;
    const { ctx, repositories } = await getServerApp();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? undefined;
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listRunEvents(ctx, { runId: resolved.runId, sessionId })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
