import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure, safeFailure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

type Params = { params: Promise<{ systemId: string }> };

const CreateVersionSchema = z.object({ name: z.string().min(1).max(200) });
const RestoreVersionSchema = z.object({ versionId: z.string() });

export async function GET(_: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    return NextResponse.json(success(await services.versions.list(ctx, systemId)));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const raw = await request.json();
    const parsed = CreateVersionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid version name"), { status: 422 });
    }
    await services.versions.create(ctx, systemId, parsed.data.name);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const raw = await request.json();
    const parsed = RestoreVersionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid versionId"), { status: 422 });
    }
    await services.versions.restore(ctx, systemId, parsed.data.versionId);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
