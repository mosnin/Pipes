import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

export async function GET(request: Request) {
  const { ctx, services } = await getServerApp();
  const url = new URL(request.url);
  const systems = await services.systems.list(ctx);
  const systemId = url.searchParams.get("systemId") ?? systems[0]?.id ?? "";
  if (!systemId) return NextResponse.json({ ok: false, error: "No systems available" }, { status: 404 });

  return new NextResponse(await services.schema.export(ctx, systemId), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
