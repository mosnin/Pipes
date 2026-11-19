import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AgentRuntimeService } from "@/domain/services/agent_runtime";
import { apiError } from "@/lib/api/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try { const { runId } = await params; const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new AgentRuntimeService(repositories).listSandboxArtifacts(ctx, runId))); }
  catch (error) { return apiError(error); }
}
