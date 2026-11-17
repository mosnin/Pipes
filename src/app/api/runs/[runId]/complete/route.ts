import { ensureCanEdit, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ runId: string }> };

/** Complete the current step: { nodeId?, outcome?, output?, notes?, next?, costMicros?, remember? }. Send an Idempotency-Key header so a retry never completes twice. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const { ctx, identity, workflow } = await getWorkflowApp();
    ensureCanEdit(ctx);
    const body = await request.json().catch(() => ({}));
    const { run, remembered } = await workflow.completeStep(ctx, runId, { remember: body.remember, nodeId: body.nodeId, outcome: body.outcome, output: body.output, notes: body.notes, next: body.next, costMicros: typeof body.costMicros === "number" ? body.costMicros : undefined, idempotencyKey: request.headers.get("idempotency-key") ?? body.idempotencyKey, actorLabel: identity.name });
    return ok({ status: run.status, currentNodeId: run.currentNodeId, ...(remembered.length ? { remembered } : {}) });
  } catch (error) {
    return workflowError(error);
  }
}
