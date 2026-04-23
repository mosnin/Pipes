import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AgentOperationsService } from "@/domain/services/agent_operations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new AgentOperationsService(repositories).compareRuns(ctx, body.leftRunId, body.rightRunId)));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
