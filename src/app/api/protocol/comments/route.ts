import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolWrite } from "@/lib/protocol/http";

export async function POST(request: Request) {
  const body = await request.json();
  return runProtocolWrite(request, {
    route: "protocol.comments.add",
    bucket: "comments:add",
    action: "protocol.comment.add",
    targetType: "system",
    targetId: body.systemId,
    systemId: body.systemId,
    idempotent: true,
    body,
    handler: async (ctx, services, payload) => {
      requireCapability(ctx, "comments:write", payload.systemId);
      await services.comments.add(ctx, payload);
      return { ok: true };
    }
  });
}
