import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

export async function POST(req: Request) {
  const { services, ctx } = await getServerApp();
  const { listingId, name } = await req.json() as { listingId: string; name: string };
  try {
    // Create a new system based on the listing
    const systemId = await services.systems.create(ctx, {
      name: `${name} (imported)`,
      description: `Imported from Looper Marketplace listing: ${listingId}`,
      visibility: "private",
    });
    return NextResponse.json({ ok: true, data: { systemId } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
