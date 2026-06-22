import { NextResponse } from "next/server";
import { success, failure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { repositories } = await getServerApp();
    const { systemId } = await params;

    const bundle = await repositories.systems.getBundle(systemId);

    const nodesByType: Record<string, number> = {};
    for (const node of bundle.nodes) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
    }

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentBuilds = bundle.versions.filter(
      (v: { createdAt: string }) => new Date(v.createdAt).getTime() >= thirtyDaysAgo,
    );

    const buildsByDay: Record<string, number> = {};
    for (const v of recentBuilds as Array<{ createdAt: string }>) {
      const day = v.createdAt.slice(0, 10);
      buildsByDay[day] = (buildsByDay[day] ?? 0) + 1;
    }

    return NextResponse.json(
      success({
        nodeCount: bundle.nodes.length,
        pipeCount: bundle.pipes.length,
        versionCount: bundle.versions.length,
        recentBuildCount: recentBuilds.length,
        nodesByType,
        buildsByDay,
        createdAt: bundle.system.createdAt,
        updatedAt: bundle.system.updatedAt,
      }),
    );
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
