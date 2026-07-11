import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

export async function POST(req: Request, { params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  const { services, ctx } = await getServerApp();
  const { visibility } = await req.json() as { visibility: "public" | "private" };
  if (visibility !== "public" && visibility !== "private") {
    return NextResponse.json({ ok: false, error: "visibility must be 'public' or 'private'" }, { status: 400 });
  }
  try {
    await services.systems.setVisibility(ctx, systemId, visibility);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
