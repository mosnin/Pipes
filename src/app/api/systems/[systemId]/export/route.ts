import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { ctx, services } = await getServerApp();
  const { systemId } = await params;
  const result = await services.importExport.exportSystem(ctx, systemId);
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format === "markdown") return new NextResponse(result.markdown, { headers: { "content-type": "text/markdown" } });
  return new NextResponse(result.canonical, { headers: { "content-type": "application/json" } });
}
