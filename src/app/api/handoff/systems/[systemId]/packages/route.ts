import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { HandoffGenerationService } from "@/domain/services/handoff_generation";

export async function GET(_request: Request, { params }: { params: Promise<{ systemId: string }> }) {
  try { const { systemId } = await params; const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new HandoffGenerationService(repositories).listPackages(ctx, systemId))); }
  catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ systemId: string }> }) {
  try {
    const { systemId } = await params;
    const body = await request.json().catch(() => ({}));
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new HandoffGenerationService(repositories).generate(ctx, { systemId, target: body.target ?? "human_engineer", sourceRunId: body.sourceRunId })));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
