import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    const result = await services.graph.mutate(ctx, body);
    return NextResponse.json(success({ ok: true, result }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
