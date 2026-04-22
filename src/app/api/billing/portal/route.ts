import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function POST() {
  try {
    const { ctx, services } = await getServerApp();
    const session = await services.billing.startPortal(ctx);
    return NextResponse.json(success(session));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
