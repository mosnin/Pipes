import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ runId: string }> };

/** The run's journal, oldest first. `?afterSeq=` returns only newer events. */
export async function GET(request: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const { ctx, workflow } = await getWorkflowApp();
    const afterSeq = Number(new URL(request.url).searchParams.get("afterSeq") ?? 0) || 0;
    return ok(await workflow.runs.events(ctx, runId, afterSeq));
  } catch (error) {
    return workflowError(error);
  }
}
