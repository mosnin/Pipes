import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const { ctx, services, identity } = await getServerApp();
    const body = await request.json();
    const session = await services.billing.startCheckout(ctx, body.plan, identity.email);
    return NextResponse.json(success(session));
  } catch (error) {
    return apiError(error);
  }
}
