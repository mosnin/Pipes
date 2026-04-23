import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success(await services.governance.workspaceExportManifest(ctx)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
