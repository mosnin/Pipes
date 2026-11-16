import { ensureCanEdit, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ runId: string }> };

/** Complete the current step: { nodeId?, outcome?, output?, notes?, next? } */
export async function POST(request: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const { ctx, identity, workflow } = await getWorkflowApp();
    ensureCanEdit(ctx);
    const body = await request.json().catch(() => ({}));
    const run = await workflow.runs.complete(ctx, runId, { nodeId: body.nodeId, outcome: body.outcome, output: body.output, notes: body.notes, next: body.next, actorLabel: identity.name });
    return ok({ status: run.status, currentNodeId: run.currentNodeId });
  } catch (error) {
    return workflowError(error);
  }
}
