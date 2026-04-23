import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AgentOperationsService } from "@/domain/services/agent_operations";

export async function GET() {
  try { const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new AgentOperationsService(repositories).listBuilderPresets(ctx))); }
  catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}

export async function POST(request: Request) {
  try { const body = await request.json(); const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new AgentOperationsService(repositories).setActivePreset(ctx, body.presetId))); }
  catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
