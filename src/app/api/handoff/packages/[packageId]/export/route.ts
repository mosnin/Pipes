import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";
import { HandoffExportService } from "@/domain/services/handoff_export";

const ExportSchema = z.object({
  format: z.enum(["markdown_bundle", "json_manifest", "prompt_pack_text"]).default("markdown_bundle"),
});

export async function POST(request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = ExportSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid export format"), { status: 422 });
    }
    const { packageId } = await params;
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new HandoffExportService(repositories).export(ctx, { packageId, format: parsed.data.format })));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
