import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success(await services.governance.workspaceExportManifest(ctx)));
  } catch (error) {
    return apiError(error);
  }
}
