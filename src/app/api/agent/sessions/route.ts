import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { ctx, repositories } = await getServerApp();
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId") ?? undefined;
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.listSessions(ctx, systemId)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, repositories } = await getServerApp();
    const body = await request.json();
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.createSession(ctx, { systemId: body.systemId, title: body.title })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
