import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";
import { getEntitlements } from "@/domain/templates/plans";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    await services.library.markOpened(ctx, systemId);
    const data = await services.systems.getBundle(ctx, systemId);
    const entitlements = getEntitlements(ctx.plan);
    return NextResponse.json(success({
      ...data,
      entitlements: {
        privateLoops: entitlements.privateLoops,
        marketplaceSelling: entitlements.marketplaceSelling,
        mcpReadWrite: entitlements.mcpReadWrite,
        aiGeneration: entitlements.aiGeneration,
        versionHistory: entitlements.versionHistory,
      },
    }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 404 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const body = await request.json();
    if (body.action === "archive") await services.library.archive(ctx, systemId);
    if (body.action === "restore") await services.library.restore(ctx, systemId);
    return NextResponse.json(success({ systemId }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const body = await request.json() as { name?: string };
    if (body.name !== undefined) await services.systems.rename(ctx, systemId, body.name);
    return NextResponse.json(success({ systemId }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
