import { NextResponse } from "next/server";
import { createWorkflowServices } from "@/domain/workflow";
import { RUN_KIND } from "@/domain/runs/service";
import type { WorkflowRun } from "@/domain/runs/types";
import { getRepositories } from "@/lib/composition/server";

/**
 * Applies time-based rails (run deadlines, step timeouts) to runs nobody has
 * touched. Every read of a run already applies them; this pass catches the
 * rest. Call it every few minutes with `Authorization: Bearer $CRON_SECRET`.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized", message: "Set CRON_SECRET and send it as a bearer token." }, { status: 401 });
  }
  const repositories = getRepositories();
  const workflow = createWorkflowServices(repositories);
  const runs = await repositories.documents.list<WorkflowRun>(RUN_KIND, {});
  const workspaces = [...new Set(runs.filter((d) => !["completed", "failed", "canceled"].includes(d.data.status)).map((d) => d.workspaceId))];
  let changed = 0;
  for (const workspaceId of workspaces) changed += await workflow.runs.sweep({ workspaceId });
  return NextResponse.json({ ok: true, data: { workspaces: workspaces.length, changed } });
}

export const GET = handle;
export const POST = handle;
