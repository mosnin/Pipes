import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success((await services.collaboration.list(ctx)).invites));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    await services.collaboration.invite(ctx, body.email, body.role);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return apiError(error);
  }
}
