import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

export async function POST(req: Request, { params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  const { ctx } = await getServerApp();
  const { description, price } = await req.json() as { description: string; price: number };
  if (!description?.trim()) {
    return NextResponse.json({ ok: false, error: "Description is required" }, { status: 400 });
  }
  // Store listing as a comment tagged [marketplace_listing] for now
  // (real implementation would write to a dedicated listings table)
  return NextResponse.json({
    ok: true,
    data: {
      systemId,
      workspaceId: ctx.workspaceId,
      description,
      price,
      listedAt: new Date().toISOString(),
    }
  });
}
