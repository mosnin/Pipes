import { NextResponse } from "next/server";
import { createWorkflowServices } from "@/domain/workflow";
import { getServerApp } from "@/lib/composition/server";

const WORKFLOW_LIMIT = 8;
const RUN_LIMIT = 6;

/**
 * The search palette's index: workflows by name or description, and recent
 * runs by id, workflow name or status, all scoped to the caller's workspace.
 * GET /api/search?q=refund
 */
export async function GET(request: Request) {
  try {
    const { ctx, services, repositories } = await getServerApp();
    const needle = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
    const matches = (...fields: Array<string | undefined>) => !needle || fields.some((field) => field?.toLowerCase().includes(needle));

    const [systems, runs] = await Promise.all([
      services.systems.list(ctx),
      createWorkflowServices(repositories).runs.listForWorkspace(ctx)
    ]);

    const workflows = systems
      .filter((system) => matches(system.name, system.description))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, WORKFLOW_LIMIT)
      .map((system) => ({ id: system.id, name: system.name }));

    const recentRuns = runs
      .filter((run) => matches(run.id, run.systemName, run.status.replace(/_/g, " ")))
      .slice(0, RUN_LIMIT)
      .map((run) => ({ id: run.id, workflowName: run.systemName, status: run.status, startedAt: run.startedAt }));

    return NextResponse.json({ ok: true, data: { workflows, runs: recentRuns } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "search_failed", message: (error as Error).message }, { status: 400 });
  }
}
