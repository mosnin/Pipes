import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AgentRuntimeService } from "@/domain/services/agent_runtime";

export async function GET(_request: Request, { params }: { params: Promise<{ artifactId: string }> }) {
  try { const { artifactId } = await params; const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new AgentRuntimeService(repositories).getArtifactPreview(ctx, artifactId))); }
  catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
