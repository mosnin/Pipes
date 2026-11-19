import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

type Params = { params: Promise<{ tokenId: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const { tokenId } = await params;
    const { ctx, services } = await getServerApp();
    await services.protocol.revokeToken(ctx, tokenId);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return apiError(error);
  }
}
