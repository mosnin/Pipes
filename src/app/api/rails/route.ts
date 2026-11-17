import { RunError } from "@/domain/runs/engine";
import { ensureSystemInWorkspace, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";
import type { AppContext } from "@/lib/repositories/contracts";

/**
 * Live rails for the workspace: kill switches and per-token limits.
 * GET reads them; POST { scope, systemId?, mode, reason? } sets a kill switch;
 * PUT { tokenLimits } saves the limits. Changing them is for owners and admins.
 */
function ensureAdmin(ctx: AppContext) {
  if (ctx.actorType !== "user" || (ctx.role !== "Owner" && ctx.role !== "Admin")) {
    throw new RunError("not_allowed", "Only owners and admins can change execution rails.");
  }
}

export async function GET() {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    const [switches, settings] = await Promise.all([workflow.runs.switches.list(ctx.workspaceId), workflow.runs.switches.settings(ctx.workspaceId)]);
    return ok({ switches, settings, canChange: ctx.actorType === "user" && (ctx.role === "Owner" || ctx.role === "Admin") });
  } catch (error) {
    return workflowError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, repositories, workflow } = await getWorkflowApp();
    ensureAdmin(ctx);
    const body = await request.json().catch(() => ({}));
    const scope = body.scope === "workflow" ? "workflow" : "workspace";
    const mode = ["off", "pause", "halt"].includes(body.mode) ? body.mode : null;
    if (!mode) throw new RunError("bad_request", "mode must be off, pause or halt.");
    if (scope === "workflow") await ensureSystemInWorkspace(repositories, ctx, String(body.systemId ?? ""));
    return ok(await workflow.runs.setKillSwitch(ctx, { scope, systemId: scope === "workflow" ? String(body.systemId) : undefined, mode, reason: typeof body.reason === "string" ? body.reason : undefined }));
  } catch (error) {
    return workflowError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    ensureAdmin(ctx);
    const body = await request.json().catch(() => ({}));
    const settings = await workflow.runs.switches.saveSettings(ctx.workspaceId, body);
    return ok({ settings });
  } catch (error) {
    return workflowError(error);
  }
}
