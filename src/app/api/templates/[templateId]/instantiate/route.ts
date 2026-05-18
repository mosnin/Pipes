import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { success, failure } from "@/lib/api/response";

type Params = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json().catch(() => ({}));
    const { templateId } = await params;
    return NextResponse.json(success(await services.templates.instantiate(ctx, templateId, body.name, body.params)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
