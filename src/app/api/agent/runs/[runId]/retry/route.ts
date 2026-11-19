import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AgentOperationsService } from "@/domain/services/agent_operations";
import { apiError } from "@/lib/api/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try { const { runId } = await params; const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new AgentOperationsService(repositories).retryRun(ctx, runId))); }
  catch (error) { return apiError(error); }
}
