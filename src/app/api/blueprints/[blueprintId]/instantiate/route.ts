import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { SubsystemBlueprintService } from "@/domain/subsystem_blueprint/service";

export async function POST(request: Request, { params }: { params: Promise<{ blueprintId: string }> }) {
  try {
    const { blueprintId } = await params;
    const body = await request.json().catch(() => ({}));
    const { ctx, repositories } = await getServerApp();
    const svc = new SubsystemBlueprintService(repositories);
    return NextResponse.json(success(await svc.instantiate(ctx, { blueprintId, targetSystemId: body.targetSystemId, offsetX: body.offsetX, offsetY: body.offsetY })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
