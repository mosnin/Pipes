import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    const systemId = await services.systems.create(ctx, { name: body.name, description: body.description });
    return NextResponse.json(success({ systemId }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
