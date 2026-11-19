import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";
import { apiError } from "@/lib/api/errors";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    await services.library.markOpened(ctx, systemId);
    const data = await services.systems.getBundle(ctx, systemId);
    return NextResponse.json(success(data));
  } catch (error) {
    return apiError(error, 404);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const body = await request.json();
    if (body.action === "archive") await services.library.archive(ctx, systemId);
    if (body.action === "restore") await services.library.restore(ctx, systemId);
    if (body.action === "rename") await services.systems.update(ctx, systemId, { name: body.name, description: body.description });
    return NextResponse.json(success({ systemId }));
  } catch (error) {
    return apiError(error);
  }
}
