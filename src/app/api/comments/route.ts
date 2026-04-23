import { NextResponse } from "next/server";
import { success, failure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    await services.comments.add(ctx, { systemId: body.systemId, body: body.body, nodeId: body.nodeId });
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
