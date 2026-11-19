import { NextResponse } from "next/server";
import { success, failure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";
import { apiError } from "@/lib/api/errors";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    return NextResponse.json(success(await services.versions.list(ctx, systemId)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const body = await request.json();
    await services.versions.create(ctx, systemId, body.name);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const body = await request.json();
    await services.versions.restore(ctx, systemId, body.versionId);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return apiError(error);
  }
}
