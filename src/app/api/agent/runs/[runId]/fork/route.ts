import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AgentOperationsService } from "@/domain/services/agent_operations";

export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try { const { runId } = await params; const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new AgentOperationsService(repositories).forkRun(ctx, runId))); }
  catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
