import { ensureCanEdit, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

export async function GET() {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    return ok(await workflow.connections.list(ctx.workspaceId));
  } catch (error) {
    return workflowError(error);
  }
}

/** Create a connection: { name, type: mcp | http | skill, url, description?, headerName?, secret? } */
export async function POST(request: Request) {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    ensureCanEdit(ctx);
    const body = await request.json();
    return ok(await workflow.connections.create(ctx.workspaceId, ctx.userId, { name: String(body.name ?? ""), type: body.type, url: String(body.url ?? ""), description: body.description, headerName: body.headerName, secret: body.secret }), 201);
  } catch (error) {
    return workflowError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    ensureCanEdit(ctx);
    const id = new URL(request.url).searchParams.get("id") ?? "";
    await workflow.connections.remove(ctx.workspaceId, id);
    return ok({ removed: id });
  } catch (error) {
    return workflowError(error);
  }
}
