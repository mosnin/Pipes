import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolRead } from "@/lib/protocol/http";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { systemId } = await params;
  return runProtocolRead(request, "systems:schema", async (ctx, services) => {
    requireCapability(ctx, "schema:read", systemId);
    return services.schema.export(ctx, systemId);
  });
}
