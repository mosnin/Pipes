import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { HandoffGenerationService } from "@/domain/services/handoff_generation";

export async function GET(_request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  try { const { packageId } = await params; const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new HandoffGenerationService(repositories).getPackage(ctx, packageId))); }
  catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
