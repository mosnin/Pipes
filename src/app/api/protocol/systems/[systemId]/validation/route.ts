import { validateSystem } from "@/domain/validation";
import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolRead } from "@/lib/protocol/http";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { systemId } = await params;
  return runProtocolRead(request, "systems:validation", async (ctx, services) => {
    requireCapability(ctx, "validation:read", systemId);
    const bundle = await services.systems.getBundle(ctx, systemId);
    return validateSystem({ ...bundle.system, nodeIds: bundle.nodes.map((n) => n.id), portIds: bundle.nodes.flatMap((n) => n.portIds), pipeIds: bundle.pipes.map((p) => p.id), groupIds: [], annotationIds: [], commentIds: bundle.comments.map((c) => c.id), assetIds: [], snippetIds: [], subsystemNodeIds: [] } as never, bundle.nodes as never, [] as never, bundle.pipes as never);
  });
}
