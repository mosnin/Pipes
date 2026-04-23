import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

type Params = { params: Promise<{ token: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { token } = await params;
    await services.collaboration.cancelInvite(ctx, token);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
