import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";
import { SubsystemBlueprintService } from "@/domain/subsystem_blueprint/service";

const InstantiateBlueprintSchema = z.object({
  targetSystemId: z.string(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ blueprintId: string }> }) {
  try {
    const { blueprintId } = await params;
    const raw = await request.json().catch(() => ({}));
    const parsed = InstantiateBlueprintSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid blueprint instantiate parameters"), { status: 422 });
    }
    const { ctx, repositories } = await getServerApp();
    const svc = new SubsystemBlueprintService(repositories);
    return NextResponse.json(success(await svc.instantiate(ctx, { blueprintId, ...parsed.data })));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
