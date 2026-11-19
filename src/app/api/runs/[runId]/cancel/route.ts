import { ensureCan, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ runId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const { ctx, workflow } = await getWorkflowApp();
    ensureCan(ctx, "runs.operate");
    const body = await request.json().catch(() => ({}));
    const run = await workflow.runs.cancel(ctx, runId, body.reason);
    return ok({ status: run.status });
  } catch (error) {
    return workflowError(error);
  }
}
