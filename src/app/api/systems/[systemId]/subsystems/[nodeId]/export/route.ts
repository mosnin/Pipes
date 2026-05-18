import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { SubsystemBlueprintService } from "@/domain/subsystem_blueprint/service";

export async function POST(request: Request, { params }: { params: Promise<{ systemId: string; nodeId: string }> }) {
  try {
    const { systemId, nodeId } = await params;
    const body = await request.json().catch(() => ({}));
    const { ctx, repositories } = await getServerApp();
    const svc = new SubsystemBlueprintService(repositories);
    return NextResponse.json(success(await svc.export(ctx, { systemId, subsystemNodeId: nodeId, name: body.name })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
