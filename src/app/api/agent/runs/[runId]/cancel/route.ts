import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AgentOperationsService } from "@/domain/services/agent_operations";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try { const { runId } = await params; const body = await request.json().catch(() => ({})); const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new AgentOperationsService(repositories).cancelRun(ctx, runId, String(body.reason ?? "operator_cancel")))); }
  catch (error) { return apiError(error); }
}
