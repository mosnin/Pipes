import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { success, failure } from "@/lib/api/response";

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success(await services.billing.getSummary(ctx)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
