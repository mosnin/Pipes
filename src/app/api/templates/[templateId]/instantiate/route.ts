import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { success, failure } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

type Params = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json().catch(() => ({}));
    const { templateId } = await params;
    return NextResponse.json(success(await services.templates.instantiate(ctx, templateId, body.name)));
  } catch (error) {
    return apiError(error);
  }
}
