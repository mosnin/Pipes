import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { HandoffExportService } from "@/domain/services/handoff_export";

export async function POST(request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { packageId } = await params;
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new HandoffExportService(repositories).export(ctx, { packageId, format: body.format ?? "markdown_bundle" })));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
