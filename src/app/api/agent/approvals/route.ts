import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { ctx, repositories } = await getServerApp();
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId") ?? undefined;
    const systemId = searchParams.get("systemId") ?? undefined;
    const status = (searchParams.get("status") ?? undefined) as "pending" | "approved" | "rejected" | undefined;
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listApprovals(ctx, { runId, systemId, status })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
