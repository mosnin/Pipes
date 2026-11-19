import { NextResponse } from "next/server";
import { RunError } from "@/domain/runs/engine";
import { createWorkflowServices } from "@/domain/workflow";
import { triggerContext } from "@/lib/api/trigger-context";
import { workflowError } from "@/lib/api/workflow";
import { getRepositories } from "@/lib/composition/server";

type Params = { params: Promise<{ systemId: string }> };

/**
 * Inbound webhook: start a run of this workflow.
 * Authenticate with the workflow's webhook key in `x-pipes-key` (or `?key=`).
 * The JSON body becomes the run's input.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const repositories = getRepositories();
    const workflow = createWorkflowServices(repositories);
    const key = request.headers.get("x-pipes-key") ?? new URL(request.url).searchParams.get("key");
    if (!(await workflow.triggers.verifyWebhookKey(systemId, key))) {
      return NextResponse.json({ ok: false, error: "unauthorized", message: "Missing or invalid webhook key." }, { status: 401 });
    }
    const bundle = await repositories.systems.getBundle(systemId).catch(() => null);
    if (!bundle) throw new RunError("system_not_found", "System not found.");
    const limited = await repositories.rateLimits.consume({ bucket: `hook:${systemId}`, windowSeconds: 60, limit: 60, now: new Date().toISOString() });
    if (!limited.allowed) return NextResponse.json({ ok: false, error: "rate_limited", message: "Too many webhook calls. Slow down." }, { status: 429 });
    const ctx = await triggerContext(repositories, bundle.system.workspaceId, `webhook:${systemId}`);
    await workflow.usage.record(ctx.workspaceId, "webhook_received", { systemId });
    const raw = await request.text();
    let input: unknown = undefined;
    if (raw) {
      try {
        input = JSON.parse(raw);
      } catch {
        input = { body: raw.slice(0, 20000) };
      }
    }
    // A sender that retries a delivery with the same Idempotency-Key starts one run, not two.
    const run = await workflow.runs.start(ctx, { systemId, trigger: "webhook", input, actorLabel: "Webhook", idempotencyKey: request.headers.get("idempotency-key") ? `hook:${systemId}:${request.headers.get("idempotency-key")}` : undefined });
    return NextResponse.json({ ok: true, data: { runId: run.id, status: run.status } }, { status: 201 });
  } catch (error) {
    return workflowError(error);
  }
}
