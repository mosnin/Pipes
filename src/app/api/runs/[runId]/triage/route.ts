import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ runId: string }> };

/**
 * Pipes' suggestion for a waiting approval: a suggested decision, a risk level
 * and whether the work looks complete. Cached per run revision. A suggestion
 * only; a person always decides. Null when decisions are off.
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const { ctx, workflow } = await getWorkflowApp();
    const run = await workflow.runs.get(ctx, runId);
    return ok(await workflow.decisions.triageApproval(run));
  } catch (error) {
    return workflowError(error);
  }
}
