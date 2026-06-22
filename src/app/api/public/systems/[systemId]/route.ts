import { NextResponse } from "next/server";
import { store } from "@/lib/convex/store";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { systemId } = await params;

  try {
    const db = store.readDb();
    const system = db.systems.find((s) => s.id === systemId && !s.archivedAt);

    if (!system || system.visibility === "private") {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const nodes = db.nodes
      .filter((n) => n.systemId === systemId)
      .map((n) => ({ id: n.id, type: n.type, title: n.title, description: n.description }));

    const pipeCount = db.pipes.filter((p) => p.systemId === systemId).length;

    return NextResponse.json({
      ok: true,
      data: {
        id: system.id,
        name: system.name,
        description: system.description,
        createdAt: system.createdAt,
        updatedAt: system.updatedAt,
        nodes,
        pipeCount,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
}
