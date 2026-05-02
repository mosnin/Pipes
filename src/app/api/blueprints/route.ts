import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { SubsystemBlueprintService } from "@/domain/subsystem_blueprint/service";

export async function GET() {
  try {
    const { ctx, repositories } = await getServerApp();
    const svc = new SubsystemBlueprintService(repositories);
    return NextResponse.json(success(await svc.list(ctx)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
