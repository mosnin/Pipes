import { ensureCanEdit, ensureSystemInWorkspace, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, repositories, workflow } = await getWorkflowApp();
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    return ok(await workflow.triggers.view(systemId));
  } catch (error) {
    return workflowError(error);
  }
}

/**
 * Manage triggers. Actions:
 * rotate_webhook | set_webhook {enabled} | add_schedule {cron,label?,input?} |
 * update_schedule {scheduleId,enabled} | remove_schedule {scheduleId} | set_outbound {url?,events?}
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, repositories, workflow } = await getWorkflowApp();
    ensureCanEdit(ctx);
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    const body = await request.json();
    const t = workflow.triggers;
    switch (body.action) {
      case "rotate_webhook":
        return ok({ key: await t.rotateWebhookKey(ctx.workspaceId, systemId), triggers: await t.view(systemId) });
      case "set_webhook":
        await t.setWebhookEnabled(ctx.workspaceId, systemId, Boolean(body.enabled));
        break;
      case "add_schedule":
        await t.addSchedule(ctx.workspaceId, systemId, { cron: String(body.cron ?? ""), label: body.label, input: body.input });
        break;
      case "update_schedule":
        await t.updateSchedule(ctx.workspaceId, systemId, String(body.scheduleId), { enabled: Boolean(body.enabled) });
        break;
      case "remove_schedule":
        await t.removeSchedule(ctx.workspaceId, systemId, String(body.scheduleId));
        break;
      case "set_outbound": {
        const result = await t.setOutbound(ctx.workspaceId, systemId, { url: body.url || undefined, events: body.events });
        return ok({ secret: result.secret, triggers: await t.view(systemId) });
      }
      default:
        throw new Error("Unknown trigger action.");
    }
    return ok({ triggers: await t.view(systemId) });
  } catch (error) {
    return workflowError(error);
  }
}
