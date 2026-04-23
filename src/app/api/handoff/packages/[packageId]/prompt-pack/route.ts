import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { HandoffExportService } from "@/domain/services/handoff_export";

export async function GET(request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  try {
    const { packageId } = await params;
    const { searchParams } = new URL(request.url);
    const target = (searchParams.get("target") as any) ?? undefined;
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new HandoffExportService(repositories).getPromptPack(ctx, { packageId, target })));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
