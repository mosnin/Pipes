import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolRead, runProtocolWrite } from "@/lib/protocol/http";

export async function GET(request: Request) {
  return runProtocolRead(request, "systems:list", async (ctx, services) => {
    requireCapability(ctx, "systems:read");
    return services.systems.list(ctx);
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  return runProtocolWrite(request, {
    route: "protocol.systems.create",
    bucket: "systems:create",
    action: "protocol.system.create",
    targetType: "system",
    idempotent: true,
    body,
    handler: async (ctx, services, payload) => {
      requireCapability(ctx, "systems:write");
      const systemId = await services.systems.create(ctx, { name: payload.name, description: payload.description });
      return { systemId };
    }
  });
}
