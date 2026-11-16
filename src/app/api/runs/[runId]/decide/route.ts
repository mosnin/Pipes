import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ runId: string }> };

/** Decide a human approval: { decision: approved | rejected | sent_back, comment?, sendBackTo? } */
export async function POST(request: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const { ctx, workflow } = await getWorkflowApp();
    const body = await request.json().catch(() => ({}));
    if (!["approved", "rejected", "sent_back"].includes(body.decision)) throw new Error("decision must be approved, rejected or sent_back.");
    const run = await workflow.runs.decide(ctx, runId, { decision: body.decision, comment: body.comment, sendBackTo: body.sendBackTo });
    return ok({ status: run.status, currentNodeId: run.currentNodeId });
  } catch (error) {
    return workflowError(error);
  }
}
