import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

export async function POST(req: Request, { params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  const { services, ctx } = await getServerApp();
  const { description, price } = await req.json() as { description: string; price: number };
  if (!description?.trim()) {
    return NextResponse.json({ ok: false, error: "Description is required" }, { status: 400 });
  }
  try {
    const listingId = await services.systems.publishListing(ctx, systemId, { description, price });
    return NextResponse.json({ ok: true, data: { listingId } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
