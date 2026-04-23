import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    const session = await services.billing.startCheckout(ctx, body.plan);
    return NextResponse.json(success(session));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
