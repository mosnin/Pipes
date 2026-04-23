import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolWrite } from "@/lib/protocol/http";

export async function POST(request: Request) {
  const body = await request.json();
  return runProtocolWrite(request, {
    route: "protocol.graph.mutate",
    bucket: "graph:mutate",
    action: `protocol.graph.${body.action ?? "mutate"}`,
    targetType: "system",
    targetId: body.systemId,
    systemId: body.systemId,
    idempotent: false,
    body,
    handler: async (ctx, services, payload) => {
      requireCapability(ctx, "graph:write", payload.systemId);
      const result = await services.graph.mutate(ctx, payload);
      return { result };
    }
  });
}
