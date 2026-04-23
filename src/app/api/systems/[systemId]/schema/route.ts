import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { ctx, services } = await getServerApp();
  const { systemId } = await params;
  const schema = await services.schema.export(ctx, systemId);
  return new NextResponse(schema, { status: 200, headers: { "content-type": "application/json" } });
}
