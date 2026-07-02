import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

type PresenceResponse = { ok: boolean; data?: unknown; error?: string };

const PresenceUpdateSchema = z.object({
  systemId: z.string(),
  sessionId: z.string().optional(),
  selectedNodeId: z.string().nullable().optional(),
  editingTarget: z.string().nullable().optional(),
  cursor: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
});

export async function GET(request: Request): Promise<NextResponse<PresenceResponse>> {
  try {
    const url = new URL(request.url);
    const systemId = url.searchParams.get("systemId") ?? "";
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success(await services.presence.list(ctx, systemId)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function POST(request: Request): Promise<NextResponse<PresenceResponse>> {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = PresenceUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid presence data"), { status: 422 });
    }
    await services.presence.upsert(ctx, parsed.data);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
