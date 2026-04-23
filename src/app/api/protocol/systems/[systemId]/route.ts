import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolRead } from "@/lib/protocol/http";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { systemId } = await params;
  return runProtocolRead(request, "systems:get", async (ctx, services) => {
    requireCapability(ctx, "systems:read", systemId);
    const bundle = await services.systems.getBundle(ctx, systemId);
    return { id: bundle.system.id, name: bundle.system.name, description: bundle.system.description, nodes: bundle.nodes.length, pipes: bundle.pipes.length };
  });
}
