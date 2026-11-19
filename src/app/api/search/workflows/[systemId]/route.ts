import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

type Params = { params: Promise<{ systemId: string }> };

/**
 * One workflow's name, for the breadcrumb. Unlike GET /api/systems/[id] it
 * reads no bundle and does not mark the workflow as opened.
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const system = (await services.systems.listAll(ctx)).find((s) => s.id === systemId);
    if (!system) return NextResponse.json({ ok: false, error: "not_found", message: "Workflow not found." }, { status: 404 });
    return NextResponse.json({ ok: true, data: { id: system.id, name: system.name, archived: Boolean(system.archivedAt) } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "lookup_failed", message: (error as Error).message }, { status: 400 });
  }
}
