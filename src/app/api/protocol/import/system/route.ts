import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolWrite } from "@/lib/protocol/http";

export async function POST(request: Request) {
  const body = await request.json();
  return runProtocolWrite(request, {
    route: "protocol.import.system",
    bucket: "import:system",
    action: "protocol.schema.import",
    targetType: "schema",
    idempotent: true,
    body,
    handler: async (ctx, services, payload) => {
      requireCapability(ctx, "import:write");
      return services.importExport.importSchema(ctx, payload.canonical, "new");
    }
  });
}
