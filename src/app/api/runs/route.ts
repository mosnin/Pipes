import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

const STATUSES = new Set(["running", "waiting_approval", "completed", "failed", "canceled"]);

export async function GET(request: Request) {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    const status = new URL(request.url).searchParams.get("status");
    return ok(await workflow.runs.listForWorkspace(ctx, { status: status && STATUSES.has(status) ? (status as never) : undefined }));
  } catch (error) {
    return workflowError(error);
  }
}
