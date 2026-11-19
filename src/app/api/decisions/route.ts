import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";
import { deciderConfig } from "@/lib/ai/openrouter/client";
import { runtimeFlags } from "@/lib/env";

/** Decision receipts and calibration for the workspace. `?runId=` narrows to one run. */
export async function GET(request: Request) {
  try {
    const { ctx, workflow } = await getWorkflowApp();
    const runId = new URL(request.url).searchParams.get("runId") ?? undefined;
    const [receipts, calibration] = await Promise.all([workflow.decisions.list(ctx.workspaceId, { runId }), runId ? null : workflow.decisions.calibration(ctx.workspaceId)]);
    const config = deciderConfig();
    return ok({
      mode: workflow.decisions.mode,
      provider: runtimeFlags.hasOpenRouter ? "openrouter" : runtimeFlags.useMocks ? "mock" : "none",
      fastModels: config.fastModels,
      deliberateModels: config.deliberateModels,
      receipts: receipts.slice(0, 100).map(({ state: _state, ...rest }) => rest),
      calibration
    });
  } catch (error) {
    return workflowError(error);
  }
}
