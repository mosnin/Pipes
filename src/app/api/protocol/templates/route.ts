import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolRead } from "@/lib/protocol/http";

export async function GET(request: Request) {
  return runProtocolRead(request, "templates:list", async (ctx, services) => {
    requireCapability(ctx, "templates:read");
    return services.templates.list();
  });
}
