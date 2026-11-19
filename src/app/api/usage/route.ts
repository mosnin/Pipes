import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

export async function GET(request: Request) {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    const month = new URL(request.url).searchParams.get("month");
    return ok(await workflow.usage.summary(ctx.workspaceId, ctx.plan, month && /^\d{4}-\d{2}$/.test(month) ? month : undefined));
  } catch (error) {
    return workflowError(error);
  }
}
