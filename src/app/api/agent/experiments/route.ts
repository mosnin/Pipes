import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AgentOperationsService } from "@/domain/services/agent_operations";
import { apiError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get("experimentId") ?? undefined;
    const { ctx, repositories } = await getServerApp();
    const service = new AgentOperationsService(repositories);
    return NextResponse.json(success(experimentId ? await service.summarizeExperimentOutcomes(ctx, experimentId) : await service.listExperiments(ctx)));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new AgentOperationsService(repositories).assignExperimentVariant(ctx, body)));
  } catch (error) { return apiError(error); }
}
