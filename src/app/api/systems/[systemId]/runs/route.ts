import { ensureCan, ensureSystemInWorkspace, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, repositories, workflow } = await getWorkflowApp();
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    return ok(await workflow.runs.listForSystem(ctx, systemId));
  } catch (error) {
    return workflowError(error);
  }
}

/** Start a run from the app, performed step by step by a person or handed to an agent. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, identity, repositories, workflow } = await getWorkflowApp();
    ensureCan(ctx, "runs.operate");
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    const body = await request.json().catch(() => ({}));
    const run = await workflow.runs.start(ctx, { systemId, trigger: "manual", input: body.input, startNodeId: body.startNodeId, actorLabel: identity.name, idempotencyKey: request.headers.get("idempotency-key") ?? body.idempotencyKey });
    return ok({ runId: run.id, status: run.status }, 201);
  } catch (error) {
    return workflowError(error);
  }
}
