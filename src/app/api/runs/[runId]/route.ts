import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ runId: string }> };

/** The full run plus the current step as an agent would receive it. */
export async function GET(_: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const { ctx, workflow } = await getWorkflowApp();
    const run = await workflow.runs.get(ctx, runId);
    const current = await workflow.currentStepWithConnections(ctx, runId, { withSecrets: false });
    return ok({ run, current });
  } catch (error) {
    return workflowError(error);
  }
}
