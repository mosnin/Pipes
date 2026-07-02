import { NextResponse } from "next/server";
import { z } from "zod";
import { failure, safeFailure, success } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";
import { getEntitlements } from "@/domain/templates/plans";

type Params = { params: Promise<{ systemId: string }> };

const SystemActionSchema = z.object({
  action: z.enum(["archive", "restore", "delete", "duplicate"]),
});

const SystemPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
}).refine((v) => v.name !== undefined || v.description !== undefined, {
  message: "At least one field (name or description) must be provided",
});

export async function GET(_: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    await services.library.markOpened(ctx, systemId);
    const data = await services.systems.getBundle(ctx, systemId);
    const entitlements = getEntitlements(ctx.plan);
    return NextResponse.json(success({
      ...data,
      entitlements: {
        privateLoops: entitlements.privateLoops,
        marketplaceSelling: entitlements.marketplaceSelling,
        mcpReadWrite: entitlements.mcpReadWrite,
        aiGeneration: entitlements.aiGeneration,
        versionHistory: entitlements.versionHistory,
        loopAnalytics: entitlements.loopAnalytics,
      },
    }));
  } catch (error) {
    return NextResponse.json(safeFailure(error, "System not found"), { status: 404 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const raw = await request.json();
    const parsed = SystemActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid action"), { status: 422 });
    }
    const { action } = parsed.data;
    if (action === "archive") await services.library.archive(ctx, systemId);
    if (action === "restore") await services.library.restore(ctx, systemId);
    if (action === "delete") await services.systems.delete(ctx, systemId);
    if (action === "duplicate") {
      const newSystemId = await services.systems.duplicate(ctx, systemId);
      return NextResponse.json(success({ systemId: newSystemId }));
    }
    return NextResponse.json(success({ systemId }));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const raw = await request.json();
    const parsed = SystemPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid patch parameters"), { status: 422 });
    }
    if (parsed.data.name !== undefined) await services.systems.rename(ctx, systemId, parsed.data.name);
    if (parsed.data.description !== undefined) await services.systems.updateDescription(ctx, systemId, parsed.data.description);
    return NextResponse.json(success({ systemId }));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
