import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const systemId = url.searchParams.get("systemId") ?? undefined;
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listBuilderStrategies(ctx, { systemId })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.setBuilderStrategy(ctx, { systemId: body.systemId, name: body.name, summary: body.summary })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
