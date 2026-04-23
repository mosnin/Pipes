import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolRead, runProtocolWrite } from "@/lib/protocol/http";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { systemId } = await params;
  return runProtocolRead(request, "versions:list", async (ctx, services) => {
    requireCapability(ctx, "versions:read", systemId);
    return services.versions.list(ctx, systemId);
  });
}

export async function POST(request: Request, { params }: Params) {
  const { systemId } = await params;
  const body = await request.json().catch(() => ({}));
  return runProtocolWrite(request, {
    route: "protocol.versions.create",
    bucket: "versions:create",
    action: "protocol.version.create",
    targetType: "system",
    targetId: systemId,
    systemId,
    idempotent: true,
    body: { ...body, systemId },
    handler: async (ctx, services, payload) => {
      requireCapability(ctx, "versions:write", payload.systemId);
      await services.versions.create(ctx, payload.systemId, payload.name ?? "Protocol snapshot");
      return { ok: true };
    }
  });
}
