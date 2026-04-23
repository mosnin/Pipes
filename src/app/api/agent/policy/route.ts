import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentPolicyService } from "@/domain/services/agent_policy";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { ctx, repositories } = await getServerApp();
    const service = new AgentPolicyService(repositories);
    return NextResponse.json(success(await service.getPolicy(ctx, { systemId: searchParams.get("systemId") ?? undefined })));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    const service = new AgentPolicyService(repositories);
    return NextResponse.json(success(await service.updatePolicy(ctx, body)));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
