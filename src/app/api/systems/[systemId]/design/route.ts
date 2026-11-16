import { ensureCanEdit, ensureSystemInWorkspace, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ systemId: string }> };

/** The system's design document: step specs, route specs, node definitions, subsystems. */
export async function GET(_: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, repositories, workflow } = await getWorkflowApp();
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    return ok(await workflow.design.get(systemId));
  } catch (error) {
    return workflowError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, repositories, workflow } = await getWorkflowApp();
    ensureCanEdit(ctx);
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    const body = await request.json();
    return ok(await workflow.design.update(ctx.workspaceId, systemId, { steps: body.steps, routes: body.routes, nodeDefinitions: body.nodeDefinitions, subsystems: body.subsystems }));
  } catch (error) {
    return workflowError(error);
  }
}
