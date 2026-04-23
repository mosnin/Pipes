import { requireCapability } from "@/lib/protocol/auth";
import { runProtocolWrite } from "@/lib/protocol/http";

type Params = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, { params }: Params) {
  const body = await request.json().catch(() => ({}));
  const { templateId } = await params;
  return runProtocolWrite(request, {
    route: "protocol.templates.instantiate",
    bucket: "templates:instantiate",
    action: "protocol.template.instantiate",
    targetType: "template",
    targetId: templateId,
    idempotent: true,
    body: { ...body, templateId },
    handler: async (ctx, services, payload) => {
      requireCapability(ctx, "templates:instantiate");
      return services.templates.instantiate(ctx, payload.templateId, payload.name);
    }
  });
}
