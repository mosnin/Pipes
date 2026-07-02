import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { safeFailure, success } from "@/lib/api/response";

const SignalSchema = z.object({
  event: z.string().max(100),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = SignalSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json(success({ ok: true })); // silently ignore malformed signals
    await services.signals.trackUnknown(ctx, parsed.data.event, parsed.data.metadata ?? {});
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
