import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { HandoffGenerationService } from "@/domain/services/handoff_generation";
import { apiError } from "@/lib/api/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  try { const { packageId } = await params; const { ctx, repositories } = await getServerApp(); return NextResponse.json(success(await new HandoffGenerationService(repositories).getPackage(ctx, packageId))); }
  catch (error) { return apiError(error); }
}
