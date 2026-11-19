import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

const STATUSES = new Set(["running", "waiting_approval", "completed", "failed", "canceled"]);

/** GET /api/runs/count?status=waiting_approval answers `{ count }`, for badges that only need the number. */
export async function GET(request: Request) {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    const status = new URL(request.url).searchParams.get("status");
    const count = await workflow.runs.countForWorkspace(ctx, { status: status && STATUSES.has(status) ? (status as never) : undefined });
    return ok({ count });
  } catch (error) {
    return workflowError(error);
  }
}
